import { describe, it, expect } from "bun:test";
import { validatePlayerName, validateRoomId, validatePlayerId, isValidOrigin, validateBid } from "./validation";

describe("Validation Utils", () => {
  describe("validatePlayerName", () => {
    it("should allow valid names", () => {
      expect(validatePlayerName("Player 1")).toBeNull();
      expect(validatePlayerName("User123")).toBeNull();
    });

    it("should reject too short names", () => {
      expect(validatePlayerName("")).toBe("Player name is required");
      expect(validatePlayerName("  ")).toBe("Player name is too short");
    });

    it("should reject too long names", () => {
      expect(validatePlayerName("A".repeat(21))).toBe("Player name is too long (max 20 characters)");
    });

    it("should reject invalid characters", () => {
      expect(validatePlayerName("Player@")).toBe("Player name contains invalid characters (only alphanumeric and spaces allowed)");
    });

    it("should handle null/undefined/non-string", () => {
      // @ts-ignore
      expect(validatePlayerName(null)).toBe("Player name is required");
      // @ts-ignore
      expect(validatePlayerName(undefined)).toBe("Player name is required");
      // @ts-ignore
      expect(validatePlayerName(123)).toBe("Player name is required");
    });
  });

  describe("validateRoomId", () => {
    it("should allow valid room IDs", () => {
      expect(validateRoomId("ABCD")).toBeNull();
      expect(validateRoomId("1234")).toBeNull();
      expect(validateRoomId("A1B2C3")).toBeNull();
    });

    it("should reject empty room IDs", () => {
      expect(validateRoomId("")).toBe("Room ID is required");
    });

    it("should reject too long room IDs", () => {
      expect(validateRoomId("ABCDEFG")).toBe("Room ID is too long");
    });

    it("should reject invalid characters", () => {
      expect(validateRoomId("AB-D")).toBe("Room ID contains invalid characters");
      expect(validateRoomId("AB D")).toBe("Room ID contains invalid characters");
    });

    it("should handle null/undefined/non-string", () => {
      // @ts-ignore
      expect(validateRoomId(null)).toBe("Room ID is required");
      // @ts-ignore
      expect(validateRoomId(undefined)).toBe("Room ID is required");
      // @ts-ignore
      expect(validateRoomId(123)).toBe("Room ID is required");
    });
  });

  describe("validatePlayerId", () => {
    it("should allow valid player IDs (UUIDs)", () => {
      expect(validatePlayerId("550e8400-e29b-41d4-a716-446655440000")).toBeNull();
    });

    it("should allow valid player IDs (Bot format)", () => {
      expect(validatePlayerId("bot-abc12")).toBeNull();
    });

    it("should allow valid player IDs (Fallback format)", () => {
      expect(validatePlayerId("abc123def456")).toBeNull();
    });

    it("should reject empty player IDs", () => {
      expect(validatePlayerId("")).toBe("Player ID is required");
    });

    it("should reject too long player IDs", () => {
      expect(validatePlayerId("A".repeat(37))).toBe("Player ID is too long");
    });

    it("should reject invalid characters", () => {
      expect(validatePlayerId("player id")).toBe("Player ID contains invalid characters");
      expect(validatePlayerId("player@id")).toBe("Player ID contains invalid characters");
    });

    it("should handle null/undefined/non-string", () => {
      // @ts-ignore
      expect(validatePlayerId(null)).toBe("Player ID is required");
      // @ts-ignore
      expect(validatePlayerId(undefined)).toBe("Player ID is required");
      // @ts-ignore
      expect(validatePlayerId(123)).toBe("Player ID is required");
    });
  });

  describe("validateBid", () => {
    it("should allow valid standard bids", () => {
      expect(validateBid("Gesund")).toBeNull();
      expect(validateBid("Hochzeit")).toBeNull();
      expect(validateBid("DamenSolo")).toBeNull();
      expect(validateBid("BubenSolo")).toBeNull();
      expect(validateBid("DamenBubensolo")).toBeNull();
      expect(validateBid("Fleischlos")).toBeNull();
    });

    it("should allow valid FarbenSolo bids", () => {
      expect(validateBid("FarbenSolo_Kreuz")).toBeNull();
      expect(validateBid("FarbenSolo_Pik")).toBeNull();
      expect(validateBid("FarbenSolo_Herz")).toBeNull();
      expect(validateBid("FarbenSolo_Karo")).toBeNull();
    });

    it("should reject invalid bid strings", () => {
      expect(validateBid("InvalidBid")).toBe("Invalid bid value");
      expect(validateBid("Solo")).toBe("Invalid bid value");
    });

    it("should reject malformed FarbenSolo bids", () => {
      expect(validateBid("FarbenSolo_")).toBe("Invalid bid value");
      expect(validateBid("FarbenSolo_Invalid")).toBe("Invalid bid value");
      expect(validateBid("FarbenSolo")).toBe("Invalid bid value");
    });

    it("should reject empty or non-string bids", () => {
      // @ts-ignore
      expect(validateBid(null)).toBe("Bid is required");
      expect(validateBid("")).toBe("Bid is required");
    });
  });

  describe("isValidOrigin", () => {
    it("should allow valid origins", () => {
      expect(isValidOrigin("http://localhost:5173")).toBe(true);
      expect(isValidOrigin("https://example.com")).toBe(true);
      expect(isValidOrigin("http://127.0.0.1:3000")).toBe(true);
      expect(isValidOrigin("http://[::1]")).toBe(true);
      expect(isValidOrigin("https://example.com/")).toBe(true);
      expect(isValidOrigin("HTTPS://EXAMPLE.COM")).toBe(true);
      expect(isValidOrigin("https://user:pass@example.com")).toBe(true);
    });

    it("should reject wildcard", () => {
      expect(isValidOrigin("*")).toBe(false);
    });

    it("should reject origins without protocol", () => {
      expect(isValidOrigin("example.com")).toBe(false);
      expect(isValidOrigin("localhost:5173")).toBe(false);
    });

    it("should reject malformed URLs", () => {
      expect(isValidOrigin("not-a-url")).toBe(false);
      expect(isValidOrigin("http://")).toBe(false);
    });

    it("should reject non-http/https protocols", () => {
      expect(isValidOrigin("ftp://example.com")).toBe(false);
      expect(isValidOrigin("javascript:alert(1)")).toBe(false);
    });

    it("should handle null/undefined/empty", () => {
      expect(isValidOrigin("")).toBe(false);
      // @ts-ignore
      expect(isValidOrigin(null)).toBe(false);
      // @ts-ignore
      expect(isValidOrigin(undefined)).toBe(false);
    });

    it("should reject non-URL strings", () => {
      expect(isValidOrigin("localhost")).toBe(false);
      expect(isValidOrigin("127.0.0.1")).toBe(false);
    });
  });
});
