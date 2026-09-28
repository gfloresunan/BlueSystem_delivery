import { SecretService } from "../config/secretManager";

describe("SecretService Infrastructure Unit Tests", () => {
  let secretService: SecretService;

  beforeEach(() => {
    secretService = SecretService.getInstance();
    secretService.invalidateCache();
  });

  test("should retrieve secret from environment fallback if available", async () => {
    process.env.GOOGLE_MAPS_API_KEY = "test_google_maps_key_12345";
    const value = await secretService.getSecret("GOOGLE_MAPS_API_KEY");
    expect(value).toBe("test_google_maps_key_12345");
  });

  test("should throw Error when required secret is missing", async () => {
    delete process.env.PAYMENT_SECRET;
    await expect(secretService.getSecret("PAYMENT_SECRET")).rejects.toThrow(
      "[SecretService CRITICAL ERROR]"
    );
  });

  test("should cache retrieved secrets in memory", async () => {
    process.env.FCM_SERVER_KEY = "fcm_test_secret_key";
    const val1 = await secretService.getSecret("FCM_SERVER_KEY");
    process.env.FCM_SERVER_KEY = "modified_key_should_not_override_cache";
    const val2 = await secretService.getSecret("FCM_SERVER_KEY");
    expect(val1).toBe("fcm_test_secret_key");
    expect(val2).toBe("fcm_test_secret_key");
  });
});
