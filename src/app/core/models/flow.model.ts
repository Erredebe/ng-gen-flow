export enum NodeType {
  START = 'START',
  TASK = 'TASK',
  DECISION = 'DECISION',
  SCRIPT = 'SCRIPT',
  API = 'API',
  END = 'END'
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeData {
  label: string;
  description?: string;
  // For Script nodes
  script?: string;
  // For Decision nodes
  condition?: string;
  // For API nodes
  apiConfig?: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: string;
  };
}

export interface FlowNode {
  id: string;
  type: NodeType;
  position: NodePosition;
  data: NodeData;
}

export interface FlowConnection {
  id: string;
  source: string;
  target: string;
  sourcePort?: string; // e.g., 'true' or 'false' for DECISION nodes
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
}
