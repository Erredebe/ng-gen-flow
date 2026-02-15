import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlowNode, NodeType } from '../../core/models/flow.model';
import { LucideAngularModule, X, Save, Trash2 } from 'lucide-angular';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './properties.component.html',
  styleUrl: './properties.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PropertiesComponent {
  @Input() node: FlowNode | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<string>();
  @Output() updated = new EventEmitter<FlowNode>();

  readonly icons = { X, Save, Trash2 };

  onSave(): void {
    if (this.node) {
      this.updated.emit(this.node);
      this.closed.emit();
    }
  }

  onDelete(): void {
    if (this.node) {
      this.deleted.emit(this.node.id);
      this.closed.emit();
    }
  }
}
