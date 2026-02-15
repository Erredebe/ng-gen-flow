import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HistoryService<T> {
  private history = signal<T[]>([]);
  private currentIndex = signal(-1);

  public canUndo = computed(() => this.currentIndex() > 0);
  public canRedo = computed(() => this.currentIndex() < this.history().length - 1);

  public currentState = computed(() => {
    const index = this.currentIndex();
    return index >= 0 ? this.history()[index] : null;
  });

  public init(initialState: T): void {
    this.history.set([JSON.parse(JSON.stringify(initialState))]);
    this.currentIndex.set(0);
  }

  public push(state: T): void {
    const nextState = JSON.parse(JSON.stringify(state));
    
    // If we're not at the end, truncate the history
    const currentHistory = this.history().slice(0, this.currentIndex() + 1);
    
    // Don't push if it's the same as the last state
    if (JSON.stringify(currentHistory[currentHistory.length - 1]) === JSON.stringify(nextState)) {
      return;
    }

    this.history.set([...currentHistory, nextState]);
    this.currentIndex.set(this.history().length - 1);
  }

  public undo(): T | null {
    if (this.canUndo()) {
      this.currentIndex.update(i => i - 1);
      return JSON.parse(JSON.stringify(this.history()[this.currentIndex()]));
    }
    return null;
  }

  public redo(): T | null {
    if (this.canRedo()) {
      this.currentIndex.update(i => i + 1);
      return JSON.parse(JSON.stringify(this.history()[this.currentIndex()]));
    }
    return null;
  }
}
