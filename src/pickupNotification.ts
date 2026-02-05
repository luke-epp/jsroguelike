// Pickup notification system for item collection feedback

import { Position } from './types.js';

export interface PickupNotification {
  id: string;
  position: Position;
  text: string;
  color: string;
  lifetime: number;
  maxLifetime: number;
  alpha: number;
  scale: number;
}

export class PickupNotificationManager {
  private notifications: PickupNotification[] = [];
  private nextId = 0;

  spawn(position: Position, text: string, color: string = '#0ff'): void {
    const notification: PickupNotification = {
      id: `pickup_${this.nextId++}`,
      position: { x: position.x, y: position.y - 30 }, // Start above the item
      text,
      color,
      lifetime: 1500, // 1.5 seconds
      maxLifetime: 1500,
      alpha: 1.0,
      scale: 1.5 // Start large
    };

    this.notifications.push(notification);
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    for (let i = this.notifications.length - 1; i >= 0; i--) {
      const notif = this.notifications[i];

      // Float upward
      notif.position.y -= 30 * dt;

      // Update lifetime and alpha
      notif.lifetime -= deltaTime;
      notif.alpha = Math.max(0, notif.lifetime / notif.maxLifetime);

      // Scale down over time
      notif.scale = 1.5 - (1.0 - notif.alpha) * 0.5;

      // Remove if dead
      if (notif.lifetime <= 0) {
        this.notifications.splice(i, 1);
      }
    }
  }

  getNotifications(): PickupNotification[] {
    return this.notifications;
  }

  clear(): void {
    this.notifications = [];
  }
}
