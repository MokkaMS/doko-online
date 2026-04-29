import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toggleFullscreen, isIOSDevice } from '../fullscreen';

describe('fullscreen utils', () => {
  let consoleSpy: any;
  let setIsFullscreen: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setIsFullscreen = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log error when requestFullscreen fails', async () => {
    const mockDoc = {
      documentElement: {
        requestFullscreen: vi.fn().mockRejectedValue(new Error('Fullscreen denied')),
      },
      fullscreenElement: null,
    } as unknown as Document;

    const mockNav = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    } as unknown as Navigator;

    await toggleFullscreen(mockDoc, mockNav, setIsFullscreen);

    expect(mockDoc.documentElement.requestFullscreen).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Error attempting to enable full-screen mode: Fullscreen denied');
  });

  it('should toggle pseudo-fullscreen on iPhone', async () => {
    const mockDoc = {
      body: {
        classList: {
          contains: vi.fn().mockReturnValue(false),
          add: vi.fn(),
          remove: vi.fn(),
        },
      },
    } as unknown as Document;

    const mockNav = {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
    } as unknown as Navigator;

    await toggleFullscreen(mockDoc, mockNav, setIsFullscreen);

    expect(mockDoc.body.classList.add).toHaveBeenCalledWith('ios-pseudo-fullscreen');
    expect(setIsFullscreen).toHaveBeenCalledWith(true);

    // Toggle off
    (mockDoc.body.classList.contains as any).mockReturnValue(true);
    await toggleFullscreen(mockDoc, mockNav, setIsFullscreen);
    expect(mockDoc.body.classList.remove).toHaveBeenCalledWith('ios-pseudo-fullscreen');
    expect(setIsFullscreen).toHaveBeenCalledWith(false);
  });

  it('should toggle pseudo-fullscreen on iPad (Mac user agent with touch)', async () => {
    const mockDoc = {
      body: {
        classList: {
          contains: vi.fn().mockReturnValue(false),
          add: vi.fn(),
          remove: vi.fn(),
        },
      },
      ontouchend: true
    } as unknown as Document;

    const mockNav = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    } as unknown as Navigator;

    await toggleFullscreen(mockDoc, mockNav, setIsFullscreen);

    expect(mockDoc.body.classList.add).toHaveBeenCalledWith('ios-pseudo-fullscreen');
    expect(setIsFullscreen).toHaveBeenCalledWith(true);
  });

  it('should call exitFullscreen when already in native fullscreen', async () => {
    const mockDoc = {
      documentElement: {
        requestFullscreen: vi.fn(),
      },
      exitFullscreen: vi.fn(),
      fullscreenElement: {},
    } as unknown as Document;

    const mockNav = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    } as unknown as Navigator;

    await toggleFullscreen(mockDoc, mockNav, setIsFullscreen);

    expect(mockDoc.exitFullscreen).toHaveBeenCalled();
    expect(mockDoc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  });

  describe('isIOSDevice', () => {
    it('should return true for iPhone user agent', () => {
      const mockNav = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)' } as Navigator;
      const mockDoc = {} as Document;
      expect(isIOSDevice(mockNav, mockDoc)).toBe(true);
    });

    it('should return true for iPad user agent', () => {
      const mockNav = { userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X)' } as Navigator;
      const mockDoc = {} as Document;
      expect(isIOSDevice(mockNav, mockDoc)).toBe(true);
    });

    it('should return true for iPod user agent', () => {
      const mockNav = { userAgent: 'Mozilla/5.0 (iPod; CPU iPhone OS 14_6 like Mac OS X)' } as Navigator;
      const mockDoc = {} as Document;
      expect(isIOSDevice(mockNav, mockDoc)).toBe(true);
    });

    it('should return true for Mac user agent with touch support (iPad desktop mode)', () => {
      const mockNav = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } as Navigator;
      const mockDoc = { ontouchend: () => {} } as unknown as Document;
      expect(isIOSDevice(mockNav, mockDoc)).toBe(true);
    });

    it('should return false for Mac user agent without touch support', () => {
      const mockNav = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } as Navigator;
      const mockDoc = {} as Document;
      expect(isIOSDevice(mockNav, mockDoc)).toBe(false);
    });

    it('should return false for Windows user agent', () => {
      const mockNav = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } as Navigator;
      const mockDoc = {} as Document;
      expect(isIOSDevice(mockNav, mockDoc)).toBe(false);
    });

    it('should return false for Android user agent', () => {
      const mockNav = { userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' } as Navigator;
      const mockDoc = {} as Document;
      expect(isIOSDevice(mockNav, mockDoc)).toBe(false);
    });
  });
});
