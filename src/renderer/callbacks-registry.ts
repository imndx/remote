
export class CallbacksRegistry {
  private nextId: number = 0
  private callbacks: Record<number, Function> = {}
  private callbackIds = new WeakMap<Function, number>();
  private locationInfo = new WeakMap<Function, string>();
  private clearInternal = setInterval(() => {
      let now = new Date().getTime();
      for (const cbId in this.callbacks) {
          let cb = this.callbacks[cbId];
          //@ts-ignore
          if (cb && cb.__ttl && cb.__ttl > 0 && now - cb.__timestamp > cb.__ttl){
              console.log('----to clear callback----', cbId, cb);
              this.callbackIds.delete(cb);
              this.locationInfo.delete(cb);
              delete this.callbacks[cbId];
          }
      }
  }, 30 * 1000)

  add (callback: Function): number {
    // The callback is already added.
    let id = this.callbackIds.get(callback);
    if (id != null) return id

    id = this.nextId += 1
    this.callbacks[id] = callback
    this.callbackIds.set(callback, id);

    // Capture the location of the function and put it in the ID string,
    // so that release errors can be tracked down easily.
    const regexp = /at (.*)/gi
    const stackString = (new Error()).stack
    if (!stackString) return id;

    let filenameAndLine: string;
    let match

    while ((match = regexp.exec(stackString)) !== null) {
      const location = match[1]
      if (location.includes('(native)')) continue
      if (location.includes('(<anonymous>)')) continue
      if (location.includes('callbacks-registry.js')) continue
      if (location.includes('remote.js')) continue
      if (location.includes('@electron/remote/dist')) continue

      const ref = /([^/^)]*)\)?$/gi.exec(location)
      if (ref) filenameAndLine = ref![1]
      break
    }

   //@ts-ignore
    callback.__id = id;
    //@ts-ignore
    callback.__filenameAndLine = filenameAndLine!;
    //@ts-ignore
    callback.__timestamp = new Date().getTime();

      this.locationInfo.set(callback, filenameAndLine!);
    return id
  }

  get (id: number): Function {
    return this.callbacks[id] || function () {}
  }

  getLocation (callback: Function): string | undefined {
    return this.locationInfo.get(callback);
  }

  apply (id: number, ...args: any[]): any {
    return this.get(id).apply(global, ...args)
  }

  remove (id: number): void {
    const callback = this.callbacks[id]
    if (callback) {
      this.callbackIds.delete(callback);
      delete this.callbacks[id]
    }
  }
}
