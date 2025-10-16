import { Pipe, PipeTransform } from '@angular/core';
@Pipe({
  standalone: true,
  name: 'formatJson',
})
export class FormatJsonPipe implements PipeTransform {
  transform(value: unknown): string {
    try {
      if (typeof value === 'string') {
        value = JSON.parse(value);
      }
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}
