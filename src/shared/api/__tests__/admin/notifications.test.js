import { describe, expect, vi, beforeEach } from "vitest";
import { qaTest } from "../../../../test/qaTest.js";

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock("@/shared/api/core/invokeEdgeFunction", () => ({
  invokeEdgeFunction: mockInvoke,
}));

import {
  sendEntryTokenEmail,
  sendJurorPinEmail,
  sendExportReport,
} from "../../admin/notifications.js";

describe("admin/notifications API", () => {
  beforeEach(() => vi.clearAllMocks());

  qaTest("api.notifications.01", async () => {
    const responseData = { ok: true, sent: true };
    mockInvoke.mockResolvedValue({ data: responseData, error: null });

    const result = await sendEntryTokenEmail({
      recipientEmail: "juror@tedu.edu",
      tokenUrl: "https://vera.tedu.edu/eval?token=abc",
      expiresIn: "24h",
      periodName: "Spring 2026",
      organizationName: "TEDU CS",
      organizationInstitution: "TED University",
      organizationId: "org-1",
      periodId: "period-1",
    });

    expect(result).toEqual(responseData);
    expect(mockInvoke).toHaveBeenCalledWith(
      "send-entry-token-email",
      expect.objectContaining({
        body: expect.objectContaining({
          recipientEmail: "juror@tedu.edu",
          tokenUrl: "https://vera.tedu.edu/eval?token=abc",
          periodName: "Spring 2026",
        }),
      })
    );
  });

  qaTest("api.notifications.02", async () => {
    const responseData = { ok: true, sent: true };
    mockInvoke.mockResolvedValue({ data: responseData, error: null });

    const result = await sendJurorPinEmail({
      recipientEmail: "juror@tedu.edu",
      jurorName: "Dr. Smith",
      pin: "123456",
      jurorAffiliation: "MIT",
      tokenUrl: "https://vera.tedu.edu/eval",
      periodName: "Spring 2026",
      organizationName: "TEDU CS",
      organizationId: "org-1",
      jurorId: "juror-1",
    });

    expect(result).toEqual(responseData);
    expect(mockInvoke).toHaveBeenCalledWith(
      "send-juror-pin-email",
      expect.objectContaining({
        body: expect.objectContaining({
          jurorName: "Dr. Smith",
          pin: "123456",
        }),
      })
    );
  });

  qaTest("api.notifications.03", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: "edge function error" } });

    await expect(
      sendExportReport({
        recipients: ["admin@tedu.edu"],
        fileName: "report.xlsx",
        fileBase64: "base64string",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        reportTitle: "Analytics Report",
        periodName: "Spring 2026",
        organization: "TEDU CS",
        department: "Computer Engineering",
        message: "Please find attached.",
        senderName: "Admin",
        ccSenderEmail: "admin@tedu.edu",
        organizationId: "org-1",
      })
    ).rejects.toMatchObject({ message: "edge function error" });
  });
});
