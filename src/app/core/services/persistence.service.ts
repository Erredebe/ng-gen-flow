import { Injectable } from '@angular/core';
import { Flow } from '../models/flow.model';

@Injectable({
  providedIn: 'root'
})
export class PersistenceService {
  private readonly STORAGE_KEY = 'ng_gen_flow_data';

  constructor() {}

  getFlows(): Flow[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  getFlowById(id: string): Flow | undefined {
    return this.getFlows().find(f => f.id === id);
  }

  saveFlow(flow: Flow): void {
    const flows = this.getFlows();
    const index = flows.findIndex(f => f.id === flow.id);
    
    if (index >= 0) {
      flows[index] = flow;
    } else {
      flows.push(flow);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(flows));
  }

  deleteFlow(id: string): void {
    const flows = this.getFlows().filter(f => f.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(flows));
  }

  exportFlow(flow: Flow): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flow, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${flow.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  importFlow(file: File): Promise<Flow> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const flow = JSON.parse(event.target?.result as string);
          resolve(flow);
        } catch (e) {
          reject(e);
        }
      };
      reader.readAsText(file);
    });
  }
}
