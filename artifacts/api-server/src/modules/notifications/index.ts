import { foundationOnly, type SandboxContext } from "../shared/contracts";
export interface NotificationService {
  send(context: SandboxContext, channel: "email" | "telegram", template: string): Promise<void>;
}
export const notificationService: NotificationService = {
  async send(): Promise<void> { foundationOnly("Outbound notification delivery"); },
};