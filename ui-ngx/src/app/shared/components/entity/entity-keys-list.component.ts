///
/// Copyright © 2016-2019 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import {COMMA, ENTER, SEMICOLON} from '@angular/cdk/keycodes';
import {AfterViewInit, Component, ElementRef, forwardRef, Input, OnInit, SkipSelf, ViewChild} from '@angular/core';
import {
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  FormGroup,
  FormGroupDirective,
  NG_VALUE_ACCESSOR, NgForm
} from '@angular/forms';
import {Observable, of} from 'rxjs';
import {map, mergeMap, startWith, tap, share, pairwise, filter} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {AppState} from '@app/core/core.state';
import {TranslateService} from '@ngx-translate/core';
import {AliasEntityType, EntityType} from '@shared/models/entity-type.models';
import {BaseData} from '@shared/models/base-data';
import {EntityId} from '@shared/models/id/entity-id';
import {EntityService} from '@core/http/entity.service';
import { MatAutocomplete, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipList, MatChipInputEvent } from '@angular/material/chips';
import { ErrorStateMatcher } from '@angular/material/core';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {DataKeyType} from '@shared/models/telemetry/telemetry.models';
import * as equal from 'deep-equal';

@Component({
  selector: 'tb-entity-keys-list',
  templateUrl: './entity-keys-list.component.html',
  styleUrls: ['./entity-keys-list.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EntityKeysListComponent),
      multi: true
    }
  ]
})
export class EntityKeysListComponent implements ControlValueAccessor, OnInit, AfterViewInit {

  keysListFormGroup: FormGroup;

  modelValue: Array<string> | null;

  entityIdValue: EntityId;

  @Input()
  set entityId(entityId: EntityId) {
    if (!equal(this.entityIdValue, entityId)) {
      this.entityIdValue = entityId;
      this.dirty = true;
    }
  }

  @Input()
  keysText: string;

  @Input()
  dataKeyType: DataKeyType;

  private requiredValue: boolean;
  get required(): boolean {
    return this.requiredValue;
  }
  @Input()
  set required(value: boolean) {
    this.requiredValue = coerceBooleanProperty(value);
  }

  @Input()
  disabled: boolean;

  @ViewChild('keyInput') keyInput: ElementRef<HTMLInputElement>;
  @ViewChild('keyAutocomplete') matAutocomplete: MatAutocomplete;
  @ViewChild('chipList') chipList: MatChipList;

  filteredKeys: Observable<Array<string>>;

  separatorKeysCodes: number[] = [ENTER, COMMA, SEMICOLON];

  searchText = '';

  private dirty = false;

  private propagateChange = (v: any) => { };

  constructor(private store: Store<AppState>,
              public translate: TranslateService,
              private entityService: EntityService,
              private fb: FormBuilder) {
    this.keysListFormGroup = this.fb.group({
      key: [null]
    });
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  ngOnInit() {
    this.filteredKeys = this.keysListFormGroup.get('key').valueChanges
      .pipe(
        map((value) => value ? value : ''),
        mergeMap(name => this.fetchKeys(name) ),
        share()
      );
  }

  ngAfterViewInit(): void {}

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.disabled) {
      this.keysListFormGroup.disable({emitEvent: false});
    } else {
      this.keysListFormGroup.enable({emitEvent: false});
    }
  }

  writeValue(value: Array<string> | null): void {
    this.searchText = '';
    if (value != null) {
      this.modelValue = [...value];
    } else {
      this.modelValue = [];
    }
  }

  onFocus() {
    if (this.dirty) {
      this.keysListFormGroup.get('key').updateValueAndValidity({onlySelf: true, emitEvent: true});
      this.dirty = false;
    }
  }

  addKey(key: string): void {
    if (!this.modelValue || this.modelValue.indexOf(key) === -1) {
      if (!this.modelValue) {
        this.modelValue = [];
      }
      this.modelValue.push(key);
      if (this.required) {
        this.chipList.errorState = false;
      }
    }
    this.propagateChange(this.modelValue);
  }

  add(event: MatChipInputEvent): void {
   if (!this.matAutocomplete.isOpen) {
      const value = event.value;
      if ((value || '').trim()) {
        this.addKey(value.trim());
      }
      this.clear('');
   }
  }

  remove(key: string) {
    const index = this.modelValue.indexOf(key);
    if (index >= 0) {
      this.modelValue.splice(index, 1);
      if (!this.modelValue.length) {
        if (this.required) {
          this.chipList.errorState = true;
        }
      }
      this.propagateChange(this.modelValue.length ? this.modelValue : null);
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.addKey(event.option.viewValue);
    this.clear('');
  }

  displayKeyFn(key?: string): string | undefined {
    return key ? key : undefined;
  }

  fetchKeys(searchText?: string): Observable<Array<string>> {
    this.searchText = searchText;
    return this.entityIdValue ? this.entityService.getEntityKeys(this.entityIdValue, searchText,
      this.dataKeyType, {ignoreLoading: true}).pipe(
      map((data) => data ? data : [])) : of([]);
  }

  clear(value: string = '') {
    this.keyInput.nativeElement.value = value;
    this.keysListFormGroup.get('key').patchValue(null, {emitEvent: true});
    setTimeout(() => {
      this.keyInput.nativeElement.blur();
      this.keyInput.nativeElement.focus();
    }, 0);
  }

}