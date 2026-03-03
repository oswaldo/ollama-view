import { expect } from 'chai';

import { FixtureFactory } from './e2e/fixtures/fixtureFactory';

suite('FixtureFactory Unit Tests', () => {
    test('createModelTag should generate a model tag with overrides', () => {
        const tag = FixtureFactory.createModelTag('test-model', { size: 123 });
        expect(tag.name).to.equal('test-model');
        expect(tag.size).to.equal(123);
        expect(tag.details.parameter_size).to.equal('7b');
    });

    test('createShowResponse should generate a show response', () => {
        const response = FixtureFactory.createShowResponse('test-model');
        expect(response.modelfile).to.contain('FROM test-model');
    });

    test('createChatChunk should generate a chat chunk', () => {
        const chunk = FixtureFactory.createChatChunk('model', 'hello', true);
        expect(chunk.model).to.equal('model');
        expect(chunk.message.content).to.equal('hello');
        expect(chunk.done).to.equal(true);
    });
});
