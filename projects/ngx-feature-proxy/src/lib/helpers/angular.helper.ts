import { VERSION } from '@angular/core';

export class AngularHelper {
  static version(): number {
    return parseInt(VERSION.major, 10);
  }
}
