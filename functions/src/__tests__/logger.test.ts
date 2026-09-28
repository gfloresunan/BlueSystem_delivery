import { Logger } from "../shared/logger/logger";

describe("Logger Infrastructure Unit Tests", () => {
  let stdoutSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = jest.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  test("should format INFO log as JSON to stdout", () => {
    Logger.info("Test info log message", { module: "test" });
    expect(stdoutSpy).toHaveBeenCalled();
    const output = JSON.parse(stdoutSpy.mock.calls[0][0]);
    expect(output.severity).toBe("INFO");
    expect(output.message).toBe("Test info log message");
    expect(output.module).toBe("test");
  });

  test("should format ERROR log as JSON to stderr", () => {
    Logger.error("Test error log message", new Error("Test Error"), { module: "test" });
    expect(stderrSpy).toHaveBeenCalled();
    const output = JSON.parse(stderrSpy.mock.calls[0][0]);
    expect(output.severity).toBe("ERROR");
    expect(output.message).toBe("Test error log message");
    expect(output.errorCode).toBe("Error");
  });

  test("should format AUDIT log correctly", () => {
    Logger.audit("CAMBIAR_ROL", "admin_01", { targetUid: "user_02" });
    expect(stdoutSpy).toHaveBeenCalled();
    const output = JSON.parse(stdoutSpy.mock.calls[0][0]);
    expect(output.severity).toBe("AUDIT");
    expect(output.userId).toBe("admin_01");
  });
});
