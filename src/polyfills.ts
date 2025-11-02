// Polyfills for Node.js modules in browser
import { Buffer } from 'buffer';
import process from 'process/browser';
import EventEmitter from 'events';

// Initialize process.env if not present
if (!process.env) {
  process.env = {};
}

// Make them available globally
(window as any).Buffer = Buffer;
(window as any).process = process;
(window as any).global = window;
(window as any).EventEmitter = EventEmitter;

export {};
