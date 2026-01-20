/**
 * Mock for ioredis library
 * Prevents Redis connection attempts during tests
 */
import { EventEmitter } from 'events';

class MockRedis extends EventEmitter {
  constructor(_options?: any) {
    super();
    // Simulate successful connection immediately
    process.nextTick(() => {
      this.emit('connect');
      this.emit('ready');
    });
  }

  // Mock common Redis methods
  get(_key: string): Promise<string | null> {
    return Promise.resolve(null);
  }

  set(_key: string, _value: string): Promise<'OK'> {
    return Promise.resolve('OK');
  }

  setex(_key: string, _seconds: number, _value: string): Promise<'OK'> {
    return Promise.resolve('OK');
  }

  del(..._keys: string[]): Promise<number> {
    return Promise.resolve(0);
  }

  exists(..._keys: string[]): Promise<number> {
    return Promise.resolve(0);
  }

  expire(_key: string, _seconds: number): Promise<number> {
    return Promise.resolve(0);
  }

  ttl(_key: string): Promise<number> {
    return Promise.resolve(-1);
  }

  incr(_key: string): Promise<number> {
    return Promise.resolve(1);
  }

  decr(_key: string): Promise<number> {
    return Promise.resolve(-1);
  }

  hget(_key: string, _field: string): Promise<string | null> {
    return Promise.resolve(null);
  }

  hset(_key: string, _field: string, _value: string): Promise<number> {
    return Promise.resolve(1);
  }

  hgetall(_key: string): Promise<Record<string, string>> {
    return Promise.resolve({});
  }

  hdel(_key: string, ..._fields: string[]): Promise<number> {
    return Promise.resolve(0);
  }

  sadd(_key: string, ..._members: string[]): Promise<number> {
    return Promise.resolve(1);
  }

  srem(_key: string, ..._members: string[]): Promise<number> {
    return Promise.resolve(0);
  }

  smembers(_key: string): Promise<string[]> {
    return Promise.resolve([]);
  }

  sismember(_key: string, _member: string): Promise<number> {
    return Promise.resolve(0);
  }

  lrange(_key: string, _start: number, _stop: number): Promise<string[]> {
    return Promise.resolve([]);
  }

  lpush(_key: string, ..._values: string[]): Promise<number> {
    return Promise.resolve(1);
  }

  rpop(_key: string): Promise<string | null> {
    return Promise.resolve(null);
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }

  quit(): Promise<void> {
    return Promise.resolve();
  }

  // Pipeline support
  pipeline() {
    return {
      exec: () => Promise.resolve([]),
      get: (_key: string) => this,
      set: (_key: string, _value: string) => this,
      del: (..._keys: string[]) => this,
      hget: (_key: string, _field: string) => this,
      hset: (_key: string, _field: string, _value: string) => this,
      expire: (_key: string, _seconds: number) => this,
    };
  }

  // Multi support
  multi() {
    return this.pipeline();
  }

  // Monitor support (for BullMQ compatibility)
  monitor(): void {
    // No-op
  }

  // Duplicate connection
  duplicate(): MockRedis {
    return new MockRedis();
  }

  static Cluster = class extends MockRedis {
    constructor(_options?: any) {
      super(_options);
    }
  };
}

export default MockRedis;
