import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsoleLogger } from '../../../src/logging/console-logger.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createConsoleLogger', () => {
  it('defaults minLevel to info — debug suppressed, info emitted via console.info', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    logger.log('debug', 'debug message');
    logger.log('info', 'info message');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledOnce();
    expect(infoSpy).toHaveBeenCalledWith('info message');
  });

  it('emits all four levels when minLevel is debug', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = createConsoleLogger({ minLevel: 'debug' });

    logger.log('debug', 'd');
    logger.log('info', 'i');
    logger.log('warn', 'w');
    logger.log('error', 'e');

    expect(debugSpy).toHaveBeenCalledOnce();
    expect(infoSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('suppresses debug, info, and warn when minLevel is error', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = createConsoleLogger({ minLevel: 'error' });

    logger.log('debug', 'd');
    logger.log('info', 'i');
    logger.log('warn', 'w');
    logger.log('error', 'e');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('uses rank-based ordering, not lexicographic', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const logger = createConsoleLogger({ minLevel: 'warn' });

    logger.log('info', 'info message');
    logger.log('warn', 'warn message');

    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('routes each level to the matching console method', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = createConsoleLogger({ minLevel: 'debug' });

    logger.log('debug', 'd');
    logger.log('info', 'i');
    logger.log('warn', 'w');
    logger.log('error', 'e');

    expect(debugSpy).toHaveBeenCalledWith('d');
    expect(infoSpy).toHaveBeenCalledWith('i');
    expect(warnSpy).toHaveBeenCalledWith('w');
    expect(errorSpy).toHaveBeenCalledWith('e');
  });

  it('calls console with message only when metadata is undefined', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    logger.log('info', 'hello');

    expect(infoSpy).toHaveBeenCalledOnce();
    expect(infoSpy).toHaveBeenCalledWith('hello');
  });

  it('swallows exceptions thrown by console methods', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {
      throw new Error('console broke');
    });
    const logger = createConsoleLogger();

    expect(() => logger.log('info', 'hello')).not.toThrow();
  });
});
