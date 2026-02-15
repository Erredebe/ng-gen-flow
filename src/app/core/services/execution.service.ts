import { Injectable, signal } from '@angular/core';
import { Flow, FlowNode, NodeType } from '../models/flow.model';
import { Observable, Subject } from 'rxjs';

export interface ExecutionLog {
  timestamp: Date;
  nodeId?: string;
  nodeLabel: string;
  message: string;
  status: 'info' | 'success' | 'error' | 'warning';
}

@Injectable({
  providedIn: 'root'
})
export class ExecutionService {
  private logsSubject = new Subject<ExecutionLog>();
  public logs$ = this.logsSubject.asObservable();

  private activeNodeId = signal<string | null>(null);
  public activeNodeId$ = this.activeNodeId;

  private isRunning = false;

  constructor() {}

  async executeFlow(flow: Flow): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    
    const startNode = flow.nodes.find(n => n.type === NodeType.START);
    if (!startNode) {
      this.log('system', 'System', 'No Start node found in flow!', 'error');
      this.isRunning = false;
      return;
    }

    this.log('system', 'System', 'Starting execution...', 'info');
    
    let currentNode: FlowNode | undefined = startNode;
    const context = { data: {} };

    while (currentNode) {
      this.activeNodeId.set(currentNode.id);
      this.log(currentNode.id, currentNode.data.label, `Executing ${currentNode.type}`, 'info');

      try {
        const nextNodeId = await this.executeNode(currentNode, flow, context);
        
        if (!nextNodeId) {
          if (currentNode.type === NodeType.END) {
             this.log(currentNode.id, currentNode.data.label, 'Flow finished successfully', 'success');
          } else {
             this.log(currentNode.id, currentNode.data.label, 'Flow stopped (no more connections)', 'warning');
          }
          break;
        }

        currentNode = flow.nodes.find(n => n.id === nextNodeId);
        await new Promise(resolve => setTimeout(resolve, 800)); // Delay for visualization
      } catch (error: any) {
        if (currentNode) {
          this.log(currentNode.id, currentNode.data.label, `Error: ${error.message}`, 'error');
        } else {
          this.log('system', 'System', `Error in execution: ${error.message}`, 'error');
        }
        break;
      }
    }

    this.activeNodeId.set(null);
    this.isRunning = false;
    this.log('system', 'System', 'Execution ended', 'info');
  }

  private async executeNode(node: FlowNode, flow: Flow, context: any): Promise<string | null> {
    switch (node.type) {
      case NodeType.START:
      case NodeType.TASK:
        return this.getNextNodeId(node.id, flow);

      case NodeType.SCRIPT:
        if (node.data.script) {
          const fn = new Function('context', node.data.script);
          fn(context);
        }
        return this.getNextNodeId(node.id, flow);

      case NodeType.DECISION:
        let result = false;
        if (node.data.condition) {
          const fn = new Function('context', `return ${node.data.condition}`);
          result = fn(context);
        }
        this.log(node.id, node.data.label, `Condition evaluated to: ${result}`, 'info');
        return this.getNextNodeId(node.id, flow, result ? 'true' : 'false');

      case NodeType.API:
        if (node.data.apiConfig) {
          const { url, method, body, headers } = node.data.apiConfig;
          this.log(node.id, node.data.label, `Calling API: ${method} ${url}`, 'info');
          const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: method !== 'GET' ? body : undefined
          });
          const data = await response.json();
          context.data[node.id] = data;
          this.log(node.id, node.data.label, `API Response received`, 'success');
        }
        return this.getNextNodeId(node.id, flow);

      case NodeType.END:
        return null;

      default:
        return null;
    }
  }

  private getNextNodeId(nodeId: string, flow: Flow, port?: string): string | null {
    const connection = flow.connections.find(c => 
      c.source === nodeId && (!port || c.sourcePort === port)
    );
    return connection ? connection.target : null;
  }

  private log(nodeId: string, nodeLabel: string, message: string, status: ExecutionLog['status']): void {
    this.logsSubject.next({
      timestamp: new Date(),
      nodeId,
      nodeLabel,
      message,
      status
    });
  }
}
