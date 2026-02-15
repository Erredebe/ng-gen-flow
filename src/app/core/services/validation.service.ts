import { Injectable } from '@angular/core';
import { Flow, NodeType } from '../models/flow.model';

export interface ValidationError {
  nodeId?: string;
  message: string;
  severity: 'error' | 'warning';
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  constructor() {}

  validateFlow(flow: Flow): ValidationError[] {
    const errors: ValidationError[] = [];

    // 1. Check for START node
    const startNodes = flow.nodes.filter(n => n.type === NodeType.START);
    if (startNodes.length === 0) {
      errors.push({ message: 'Flow must have a Start node.', severity: 'error' });
    } else if (startNodes.length > 1) {
      errors.push({ message: 'Flow can only have one Start node.', severity: 'error' });
    }

    // 2. Check for END node
    const endNodes = flow.nodes.filter(n => n.type === NodeType.END);
    if (endNodes.length === 0) {
      errors.push({ message: 'Flow should have at least one End node.', severity: 'warning' });
    }

    // 3. Check for disconnected nodes
    flow.nodes.forEach(node => {
      const hasInput = flow.connections.some(c => c.target === node.id);
      const hasOutput = flow.connections.some(c => c.source === node.id);

      if (node.type !== NodeType.START && !hasInput) {
        errors.push({ nodeId: node.id, message: `Node "${node.data.label}" is not reachable.`, severity: 'warning' });
      }

      if (node.type !== NodeType.END && !hasOutput) {
        errors.push({ nodeId: node.id, message: `Node "${node.data.label}" has no output.`, severity: 'warning' });
      }
    });

    return errors;
  }
}
