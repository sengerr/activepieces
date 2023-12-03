import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FlowRendererService } from '@activepieces/ui/feature-builder-store';
import { Observable } from 'rxjs';
import { DropEvent } from 'angular-draggable-droppable';
import {
  DROP_ZONE_HEIGHT,
  DROP_ZONE_WIDTH,
} from '../../../../canvas-utils/drawing/draw-common';
import { Action } from '@activepieces/shared';

@Component({
  selector: 'app-drop-zone',
  templateUrl: './drop-zone.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropZoneComponent implements OnInit {
  readonly DROP_ZONE_WIDTH = DROP_ZONE_WIDTH;
  readonly DROP_ZONE_HEIGHT = DROP_ZONE_HEIGHT;
  top = '';
  left = '';
  @Input() containerClass = '';
  @Input({ required: true }) btnTop = '';
  @Input({ required: true }) btnLeft = '';
  @Input({ required: true }) btnWidth = 0;
  @Input({ required: true }) btnHeight = 0;
  @Output() dragEnter = new EventEmitter<boolean>();
  @Output() dragLeave = new EventEmitter<boolean>();
  @Output() dropped = new EventEmitter<DropEvent<{ content: Action }>>();
  showDropArea$: Observable<boolean>;
  constructor(private flowRendererService: FlowRendererService) {
    this.showDropArea$ = this.flowRendererService.isDragginStep$;
  }
  ngOnInit() {
    const topPx = Number.parseFloat(this.btnTop.slice(0, -2));
    const leftPx = Number.parseFloat(this.btnLeft.slice(0, -2));
    this.top = `${topPx - DROP_ZONE_HEIGHT / 2 + this.btnHeight / 2}px`;
    this.left = `${leftPx - DROP_ZONE_WIDTH / 2 + +this.btnWidth / 2}px`;
  }
}
