import { Component, ChangeDetectionStrategy, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FFlowModule, FCreateNodeEvent, FMoveNodesEvent, FCreateConnectionEvent, FSelectionChangeEvent } from '@foblex/flow';
import { LucideAngularModule, Play, Save, Download, Upload, Trash2, Redo2, Undo2, Settings, Terminal, Info, Network, Zap, Cpu, Code, Globe, Square, CheckCircle2, X, AlertTriangle } from 'lucide-angular';
import { PersistenceService } from '../../core/services/persistence.service';
import { ExecutionService, ExecutionLog } from '../../core/services/execution.service';
import { HistoryService } from '../../core/services/history.service';
import { ValidationService, ValidationError } from '../../core/services/validation.service';
import { Flow, NodeType, FlowNode, FlowConnection } from '../../core/models/flow.model';
import { PropertiesComponent } from '../properties/properties.component';
import { Subscription } from 'rxjs';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FFlowModule, LucideAngularModule, PropertiesComponent, FormsModule],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorComponent implements OnInit, OnDestroy {
  readonly icons = {
    Play, Save, Download, Upload, Trash2, Redo2, Undo2, Settings, Terminal, Info, Network,
    Zap, Cpu, Code, Globe, Square, CheckCircle2, X, AlertTriangle
  };

  protected readonly selectionType: any = null;
  
  protected flow = signal<Flow>({
    id: 'default',
    name: 'New Flow',
    nodes: [],
    connections: []
  });

  protected isSidebarOpen = signal(true);
  protected isLogsOpen = signal(false);
  protected selectedNode = signal<FlowNode | null>(null);
  protected logs = signal<ExecutionLog[]>([]);
  protected activeNodeId = signal<string | null>(null);
  protected validationErrors = signal<ValidationError[]>([]);

  protected hasErrors = computed(() => this.validationErrors().some(e => e.severity === 'error'));

  protected canUndo = computed(() => false);
  protected canRedo = computed(() => false);

  private subs = new Subscription();

  constructor(
    private persistenceService: PersistenceService,
    private executionService: ExecutionService,
    private historyService: HistoryService<Flow>,
    private validationService: ValidationService
  ) {
    this.activeNodeId = this.executionService.activeNodeId$;
    this.canUndo = this.historyService.canUndo;
    this.canRedo = this.historyService.canRedo;
  }

  ngOnInit(): void {
    const savedFlows = this.persistenceService.getFlows();
    if (savedFlows.length > 0) {
      this.flow.set(savedFlows[0]);
      this.historyService.init(savedFlows[0]);
      this.validate();
    } else {
      this.loadSampleFlow();
    }

    this.subs.add(
      this.executionService.logs$.subscribe(log => {
        this.logs.update(current => [...current, log]);
        this.isLogsOpen.set(true);
      })
    );
  }

  private validate(): void {
    const errors = this.validationService.validateFlow(this.flow());
    this.validationErrors.set(errors);
  }

  loadSampleFlow(): void {
    const startId = crypto.randomUUID();
    const taskId = crypto.randomUUID();
    const endId = crypto.randomUUID();

    const sampleFlow: Flow = {
      id: 'sample',
      name: 'Greeting Flow',
      nodes: [
        {
          id: startId,
          type: NodeType.START,
          position: { x: 100, y: 100 },
          data: { label: 'Start' }
        },
        {
          id: taskId,
          type: NodeType.SCRIPT,
          position: { x: 400, y: 100 },
          data: { 
            label: 'Say Hello',
            script: 'console.log("Hello from Script!");\ncontext.data.greeted = true;'
          }
        },
        {
          id: endId,
          type: NodeType.END,
          position: { x: 700, y: 100 },
          data: { label: 'End' }
        }
      ],
      connections: [
        { id: crypto.randomUUID(), source: startId, target: taskId },
        { id: crypto.randomUUID(), source: taskId, target: endId }
      ]
    };

    this.flow.set(sampleFlow);
    this.historyService.init(sampleFlow);
    this.validate();
  }

  undo(): void {
    const prevState = this.historyService.undo();
    if (prevState) {
      this.flow.set(prevState);
      this.validate();
    }
  }

  redo(): void {
    const nextState = this.historyService.redo();
    if (nextState) {
      this.flow.set(nextState);
      this.validate();
    }
  }

  private pushHistory(): void {
    this.historyService.push(this.flow());
    this.validate();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
  
  onSave(): void {
    this.persistenceService.saveFlow(this.flow());
    console.log('Flow saved');
  }

  onExport(): void {
    this.persistenceService.exportFlow(this.flow());
  }

  runSimulation(): void {
    this.logs.set([]);
    this.executionService.executeFlow(this.flow());
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update(v => !v);
  }

  toggleLogs(): void {
    this.isLogsOpen.update(v => !v);
  }

  showValidationErrors(): void {
    this.logs.set([]);
    this.validationErrors().forEach(err => {
      this.logs.update(current => [...current, {
        timestamp: new Date(),
        nodeLabel: err.nodeId ? (this.flow().nodes.find(n => n.id === err.nodeId)?.data.label || 'Node') : 'System',
        message: err.message,
        status: err.severity
      }]);
    });
    this.isLogsOpen.set(true);
  }

  clearLogs(): void {
    this.logs.set([]);
  }

  onNodeCreated(event: FCreateNodeEvent): void {
    const position = event.fDropPosition || { x: event.rect.x, y: event.rect.y };

    const newNode: FlowNode = {
      id: crypto.randomUUID(),
      type: event.data as NodeType,
      position: { x: position.x, y: position.y },
      data: {
        label: `${event.data} Node`,
        script: event.data === 'SCRIPT' ? '// Write code here\nconsole.log("Hello Flow!");' : '',
        condition: event.data === 'DECISION' ? 'data.value > 0' : '',
        apiConfig: event.data === 'API' ? { url: '', method: 'GET' } : undefined
      }
    };

    this.flow.update(f => ({
      ...f,
      nodes: [...f.nodes, newNode]
    }));
    this.pushHistory();
  }

  onNodesMoved(event: FMoveNodesEvent): void {
    this.flow.update(f => ({
      ...f,
      nodes: f.nodes.map(node => {
        const movedNode = event.fNodes.find(n => n.id === node.id);
        return movedNode ? { ...node, position: movedNode.position } : node;
      })
    }));
    this.pushHistory();
  }

  onConnectionCreated(event: FCreateConnectionEvent): void {
    if (!event.fInputId) return;

    const newConnection: FlowConnection = {
      id: crypto.randomUUID(),
      source: event.fOutputId,
      target: event.fInputId
    };

    this.flow.update(f => ({
      ...f,
      connections: [...f.connections, newConnection]
    }));
    this.pushHistory();
  }

  onSelectionChanged(event: FSelectionChangeEvent): void {
    if (event.fNodeIds.length === 1) {
      const node = this.flow().nodes.find(n => n.id === event.fNodeIds[0]);
      this.selectedNode.set(node ? { ...node } : null);
    } else {
      this.selectedNode.set(null);
    }
  }

  updateNode(updatedNode: FlowNode): void {
    this.flow.update(f => ({
      ...f,
      nodes: f.nodes.map(n => n.id === updatedNode.id ? updatedNode : n)
    }));
    this.selectedNode.set(null);
    this.pushHistory();
  }

  deleteNode(nodeId: string): void {
    this.flow.update(f => ({
      ...f,
      nodes: f.nodes.filter(n => n.id !== nodeId),
      connections: f.connections.filter(c => c.source !== nodeId && c.target !== nodeId)
    }));
    this.selectedNode.set(null);
    this.pushHistory();
  }

  getNodeClass(type: NodeType): string {
    return `node-type-${type.toLowerCase()}`;
  }

  getNodeIcon(type: NodeType): any {
    switch (type) {
      case NodeType.START: return Zap;
      case NodeType.TASK: return Cpu;
      case NodeType.SCRIPT: return Code;
      case NodeType.API: return Globe;
      case NodeType.DECISION: return Square;
      case NodeType.END: return CheckCircle2;
      default: return Info;
    }
  }
}
