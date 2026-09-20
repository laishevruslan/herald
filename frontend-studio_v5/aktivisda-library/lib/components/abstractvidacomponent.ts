'use strict';

import Vida from '../vida.ts'
import { Uuid, ComponentOptions, DocumentParams, PdfFormat, Point, Dimensions, Rule} from '../typing.ts';
import { assignValues, overrideValues } from '../utils/utils.ts';
import { computeAbsolutePosition, computeRelativePosition } from '../utils/positionutils.ts';
import _get from 'lodash.get'
import _set from 'lodash.set'

import Konva from 'konva';


export default class AbstractVidaComponent {
    vida: Vida;
    _undoHistory: Array<ComponentOptions> = [];
    _redoHistory: Array<ComponentOptions> = [];

    konvaTransformer: Konva.Transformer | undefined;
    konvaElement: Konva.Node | undefined;
    options: ComponentOptions;

    editingLocale: string | null;
    displayedLocale: string | null;

    displayedPosition: Point;

    documentSize: Dimensions;

    constructor(vida: Vida, componentId: Uuid) {
        this.vida = vida;
        this.vida.draw();

        this.options = {
            id: componentId,
            i18n: {},
        }

        this.editingLocale = null;
        this.displayedLocale = null;

        this.displayedPosition = { x: 0, y: 0 };
        this.documentSize = { width: 0, height: 0 };
    }

    id(): Uuid {
        return this.options.id!;
    }

    /**
     * WARNING, zIndex is not supported on i18n
     * @returns
     */
    zIndex() {
        return this.options.zIndex!;
    }

    select() {
        console.warn('select should be overriden');
    }

    unselect() {
        console.warn('unselect should be overriden');
    }

    /**
     * Backup current state to allow undo
     * Currently does not check if the options
     * really change something
     *
     * @param options
     */
    _oppositOption(options: ComponentOptions) {
        const backupChanges = {};
        // Know which fields we want to backup
        assignValues(backupChanges, options, undefined);

        // TODO: if we changed image.id, backup also color
        // and probably other things
        overrideValues(backupChanges, this.options);
        return backupChanges;
    }

    /**
     * While backupcurrentstate creates a new entry in undohistory,
     * appendtocurrentbackup adds the options args to the last
     * entry in undohistory
     *
     * @param options
     */
    _appendToCurrentBackup(options: ComponentOptions) {
        const currentBackup = this._undoHistory[this._undoHistory.length - 1];
        this._undoHistory[this._undoHistory.length - 1] = {
            ...this._oppositOption(options),
            ...currentBackup
        }
    }

    /**
     *
     * Sometimes the combination of backupCurrentState({}) and
     * appendtocurrentbackup build empty entris in undohistory
     * This is the case when movements are constrained by rules for ex
     *
     * @returns Boolean { true if a clean was done, false elsewhere }
     */
    _cleanUndoHistory() {
        if (this._undoHistory.length <= 1) return;

        const firstToUndo = this._undoHistory[this._undoHistory.length - 1];
        if (Object.keys(firstToUndo).length === 0) {
            this._undoHistory.pop();
            return true;
        }
        return false;
    }

    _backupCurrentState(options: ComponentOptions) {
        this._undoHistory.push(this._oppositOption(options));
        this._redoHistory = [];
    }

    /**
     * This function makes an undo to the component.
     * It means it reverts the last changes made.
     * Nothing done if no undo is possible.
     *
     * This method calls the vida.onComponentUpdated hook.
     *
     * @returns
     */
    undo() {
        if (!this.canUndo()) return;
        const lastChanges = this._undoHistory.pop()!;
        this._redoHistory.push(this._oppositOption(lastChanges));
        return new Promise((resolve, reject) => {
            this._update(lastChanges, this.documentSize)
            .then((r) => {
                this.vida.onComponentUpdated(this.id());
                resolve(r);
            }).catch((err) => reject(err));
        })
    }

    /**
     * This functions makes a redo to the component.
     * Redo are currently very simple: if you undo, you can redo,
     * as long as you need it.
     * BUT if you edit by hand your component, you cannot redo anymore.
     * (adding something to your undohistory erases your redohistory)
     *
     * @returns
     */
    redo() {
        if (!this.canRedo()) return;
        const lastChanges = this._redoHistory.pop()!;
        this._undoHistory.push(this._oppositOption(lastChanges));
        return new Promise((resolve, reject) => {
            this._update(lastChanges, this.documentSize)
                .then((r) => {
                    this.vida.onComponentUpdated(this.id());
                    resolve(r);
                })
                .catch((err) => reject(err));
        });
    }

    canUndo() {
        // First element in history is initial setup
        return this._undoHistory.length > 1;
    }

    canRedo() {
        return this._redoHistory.length > 0;
    }

    update(options: ComponentOptions, document: Partial<DocumentParams>): Promise<boolean | void> {
        if (Object.keys(options).length > 0)
            this._backupCurrentState(options);
        return this._update(options, document);
    }

    // Check sur les options possibles.
    // Mise à jour de l'objet selon les options avec l'utilisation d'un cache.
    _update(options: ComponentOptions, document: Partial<DocumentParams>): Promise<boolean | void> {

        // Todo check the options? Lock?change
        assignValues(this.options, options, undefined);

        // Editing locale. We want to edit this.options.i18n[editingLocale] values
        // AND to display with this.options.i18n override
        if (
            document !== undefined &&
            document.i18n !== undefined &&
            document.i18n.editingLocale !== undefined &&
            document.i18n.editingLocale !== this.editingLocale
        ) {
            delete options.i18n;
            // Warning, side effect here:
            const newOptions = {};
            assignValues(newOptions, options, undefined);

            // Ajout des champs de la langue qui était utilisée avant, mais avec les valeurs par défaut
            if (this.editingLocale !== undefined && this.editingLocale !== null) {
                // Let options know which options are overriden in "this.editingLocale"
                assignValues(newOptions, this.options.i18n![this.editingLocale!], undefined);
                // Use default values everywhere
                overrideValues(newOptions, this.options);
            }

            // Ajout des champs de la nouvelle langue
            if (document.i18n.editingLocale) {
                assignValues(newOptions, this.options.i18n![document.i18n.editingLocale], undefined);
            }

            this.editingLocale = document.i18n.editingLocale;
            return this.internalUpdate(newOptions, document);
        }

        // Displayed locale. We want to edit default values
        // AND to override with existing i18n values
        if (
            document !== undefined &&
            document.i18n !== undefined &&
            document.i18n.displayedLocale !== null && // first time
            document.i18n.displayedLocale !== this.displayedLocale
        ) {
            const defaultLocale = this.vida.document.i18n.defaultLocale;

            // Warning, possible side effects
            const newOptions = {};
            assignValues(newOptions, options, undefined);

            // 1. Remplacer les modifs de la langue courante par celle de la langue par défaut (backup)
            assignValues(newOptions, this.options.i18n![defaultLocale], undefined);
            assignValues(this.options, this.options.i18n![defaultLocale], undefined);
            delete this.options.i18n![defaultLocale];
            this.options.i18n![defaultLocale] = {};

            if (document.i18n.displayedLocale !== defaultLocale) {
                // 2. Backup default values
                // Know which fields we want to backup
                assignValues(this.options.i18n![defaultLocale], this.options.i18n![document.i18n.displayedLocale], undefined);

                // If image.id changed, we want to backup colors and type
                if (_get(this.options.i18n![document.i18n.displayedLocale], 'image.id') !== undefined) {
                    _set(this.options.i18n![defaultLocale], 'image', { id: null, colors: this.options.image!.colors, type: null });
                }

                // Backup
                overrideValues(this.options.i18n![defaultLocale], this.options);

                // 3. Apply new lang
                assignValues(newOptions, this.options.i18n![document.i18n.displayedLocale], undefined);
            }
            assignValues(this.options, newOptions, undefined);
            this.displayedLocale = document.i18n.displayedLocale;
            return this.internalUpdate(newOptions, document);
        }

        if (this.editingLocale !== undefined) {
            if (options.i18n !== undefined) {
                // options.i18n.it.size === null --> options.size = default
                assignValues(options, options.i18n[this.editingLocale!], this.options);
            }
            delete options.i18n;
        }
        return this.internalUpdate(options, document);
    }

    internalUpdate(_options: ComponentOptions, _document: Partial<DocumentParams>): Promise<boolean | void> {
        console.warn('Internal update should be overriden');
        return new Promise<void>((resolve) => resolve());
    }

    /**
     * RandomInit computes random options for the component
     * and initializes the item
     */
    randomInit(type: string, document: Partial<DocumentParams>): Promise<boolean | void> {
        const options = this.randomOptions(type);
        // Background has zIndex == 0
        options.zIndex = this.vida.components.length + 1;
        return this.update(options, document);
    }

    randomOptions(_type: string): ComponentOptions {
        console.warn('Destroy should be overriden');
        return {};
    }

    destroy() {
        console.warn('Destroy should be overriden');
    }

    remove() {
        if (this.konvaTransformer) this.konvaTransformer.destroy();
        if (this.konvaElement) this.konvaElement.destroy();
        this.vida.draw();
    }

    // Export des options. Utilisable pour un composant d'input par ex. ou pour la sauvegarde des données
    toJson(): ComponentOptions {
        return {...this.options};
    }

    async toPdf(): Promise<PdfFormat | undefined> {
        console.warn('toPdf should be overriden');
        return {
            content: [],
            status: 'unsupported_option',
        };
    }

    /**
     *
     * This function should be called anytime the position of the
     * konva element changed thanks to Konva drag feature
     *
     * It synchronizes the konva position to the options.values
     * AND backup the previous values to the current backup state
     * YOU HAVE TO CALL this._backupCurrentState({}) BEFORE
     * IF YOU WANT TO BACKUP VALUES IN A NEW UNDO STATE
     *
     * @returns
     */
    _adjustPosition() {
        if (!this.konvaElement) return;

        if (_get(this.options.rules, 'position.fixed') || _get(this.options.rules, 'self.fixed')) {
            this.konvaElement.setAttrs(computeAbsolutePosition(this.displayedPosition, this.documentSize));
        }

        const position = computeRelativePosition({ x: this.konvaElement.x(), y: this.konvaElement.y() }, this.documentSize);
        let recomputePosition = false;
        let xRule = _get(this.options.rules, 'position.properties.x', <Rule>{});
        if (xRule.fixed !== undefined && xRule.fixed) {
            position.x = this.displayedPosition.x;
            recomputePosition = true;
        } else {
            if (xRule.min !== undefined && position.x < xRule.min) {
                position.x = xRule.min;
                recomputePosition = true;
            }
            if (xRule.max !== undefined && position.x > xRule.max) {
                position.x = xRule.max;
                recomputePosition = true;
            }
        }

        let yRule = _get(this.options.rules, 'position.properties.y', <Rule>{});
        if (yRule.fixed !== undefined && yRule.fixed) {
            position.y = this.displayedPosition.y;
            recomputePosition = true;
        } else {
            if (yRule.min !== undefined && position.y < yRule.min) {
                position.y = yRule.min;
                recomputePosition = true;
            }
            if (yRule.max !== undefined && position.y > yRule.max) {
                position.y = yRule.max;
                recomputePosition = true;
            }
        }



        const changes: any = { }
        if (Math.abs(this.displayedPosition.x - position.x) > 0.0001) {
            changes.x = position.x;
        }
        if (Math.abs(this.displayedPosition.y - position.y) > 0.0001) {
            changes.y = position.y;
        }

        if (recomputePosition) {
            // If we don't make this assign, konvaelement is not updated
            // because we believe its position is still the displayed one
            this.konvaElement.setAttrs(computeAbsolutePosition(position, this.documentSize));
        }
        if (changes.x === undefined && changes.y === undefined) {
            return;
        }

        //TODO: we should provide way to wait that this
        // promise ends?
        assignValues(this.displayedPosition, changes, undefined);

        if (this.editingLocale !== null) {
            this._appendToCurrentBackup({ i18n: { [this.editingLocale]: { position: changes } } });
            assignValues(this.options.i18n, { [this.editingLocale]: { position: changes } }, undefined);
        } else {
            this._appendToCurrentBackup({ position: changes });
            // Be careful! this.options.position === this.displayedPosition
            // creates shallow copy
            assignValues(this.options.position, changes, undefined);
        }
    }

    _adjustAngle() {
        if (!this.konvaElement) return;
        let newAngle = this.currentAngle()!;

        let recomputeAngle = false;
        const rule = _get(this.options.rules, 'angle', <Rule>{});
        if (rule.fixed !== undefined && rule.fixed) {
            newAngle = this.optionsValue('angle');
            recomputeAngle = true;
        } else {
            if (rule.min !== undefined && newAngle < rule.min) {
                newAngle = rule.min;
                recomputeAngle = true;
            }
            if (rule.max !== undefined && newAngle > rule.max) {
                newAngle = rule.max;
                recomputeAngle = true;
            }
        }

        if (recomputeAngle) {
            this.konvaElement?.rotation(newAngle);
        }

        if (this.editingLocale !== null) {
            let previousAngle = _get(this.options.i18n, `${this.editingLocale}.angle`) as number | undefined;

            if (previousAngle === undefined) previousAngle = this.options.angle!;
            if (Math.abs(previousAngle - newAngle) > 0.1) {
                this._appendToCurrentBackup({ i18n: { [this.editingLocale]: { angle: newAngle } } });
                assignValues(this.options.i18n, { [this.editingLocale]: { angle: newAngle } }, undefined);
            }
        } else {
            const previousAngle = this.options.angle!;
            if (Math.abs(previousAngle - newAngle) > 0.1) {
                this._appendToCurrentBackup({ angle: newAngle });
                this.options.angle = newAngle;
            }
        }
    }

    currentAngle(): number | undefined {
        if (!this.konvaElement) return undefined;
        return this.konvaElement.rotation();
    }

    optionsValue(key: string): any {
        if (this.editingLocale !== null && _get(this.options.i18n, `${this.editingLocale}.${key}`) !== undefined)
            return (<unknown>_get(this.options.i18n, `${this.editingLocale}.${key}`));
        return _get(this.options, key)!;
    }

    allowedActions() {
        if (_get(this.options.rules, 'self.fixed'))
            return new Set();
        const actions = new Set(['remove', 'duplicate', 'forward', 'backward']);
        if (_get(this.options.rules, 'presence.fixed'))
            actions.delete('remove')
        if (_get(this.options.rules, 'unicity.fixed'))
            actions.delete('duplicate')
        if (_get(this.options.rules, 'zIndex.fixed')) {
            actions.delete('forward')
            actions.delete('backward')
        }
        return actions;
    }
}
