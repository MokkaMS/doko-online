import { describe, it, expect } from "bun:test";
import { validatePlayerName, validateRoomId, validatePlayerId } from "./validation";

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
  });
});
