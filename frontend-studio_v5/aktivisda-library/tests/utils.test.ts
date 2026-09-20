import { it } from 'node:test';
import { expect, test } from 'vitest';
import { cleanUndefined, extractBestTranslation } from '../lib/utils/utils';

test('Check extractBestTranslation', () => {
    it('Translation exists', () => {
        const translations = { 'fr': 'Bonjour', 'en': 'Hello' };
        expect(extractBestTranslation(translations, 'fr', 'en')).toBe('Bonjour');
    })

    it('Translation does not exists but default yest', () => {
        const translations = { 'fr': 'Bonjour', 'en': 'Hello' };
        expect(extractBestTranslation(translations, 'es', 'en')).toBe('Hello');
    })

    it('Translation in locale and default don\t exist', () => {
        const translations = { 'fr': 'Bonjour'};
        expect(extractBestTranslation(translations, 'es', 'en')).toBe('Bonjour');
    })
})

test('Check cleanUndefined', () => {
    it('Remove two undefined', () => {
        const obj = { hello: undefined, world: undefined };
        cleanUndefined(obj);
        expect(obj).toStrictEqual({})
    })
    it('Remove one undefined', () => {
        const obj = { hello: undefined, world: "world" };
        cleanUndefined(obj);
        expect(obj).toStrictEqual({ world: "world" })
    })
})