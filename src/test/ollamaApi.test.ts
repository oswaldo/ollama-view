import * as assert from 'assert';
import * as sinon from 'sinon';
import * as http from 'http';
import { OllamaApi } from '../ollamaApi';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

describe('OllamaApi', () => {
    let api: OllamaApi;
    let httpRequestStub: sinon.SinonStub;

    beforeEach(() => {
        api = new OllamaApi();
        httpRequestStub = sinon.stub(http, 'request');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('listModels should return models on success', async () => {
        const mockResponse = new PassThrough();
        mockResponse.push(JSON.stringify({ models: [{ name: 'test-model', size: 100 }] }));
        mockResponse.end();

        const httpGetStub = sinon.stub(http, 'get').yields(mockResponse);

        const models = await api.listModels();
        assert.strictEqual(models.length, 1);
        assert.strictEqual(models[0].name, 'test-model');
    });

    it('deleteModel should resolve on 200', async () => {
        const mockReq = new EventEmitter();
        (mockReq as any).write = sinon.stub(); // Cast to any to mock write
        (mockReq as any).end = sinon.stub();

        httpRequestStub.returns(mockReq as any);

        const mockRes = new EventEmitter();
        (mockRes as any).statusCode = 200;

        setTimeout(() => {
            httpRequestStub.callArgWith(2, mockRes);
            mockRes.emit('end');
        }, 10);

        await api.deleteModel('test-model');
        assert.ok(true, 'Delete resolved');
    });

    it('deleteModel should reject on 400', async () => {
        const mockReq = new EventEmitter();
        (mockReq as any).write = sinon.stub();
        (mockReq as any).end = sinon.stub();

        httpRequestStub.returns(mockReq as any);

        const mockRes = new EventEmitter();
        (mockRes as any).statusCode = 400;

        setTimeout(() => {
            httpRequestStub.callArgWith(2, mockRes);
            mockRes.emit('data', 'Bad Request');
            mockRes.emit('end');
        }, 10);

        try {
            await api.deleteModel('test-model');
            assert.fail('Should have rejected');
        } catch (err: any) {
            assert.ok(err.message.includes('Status: 400'));
        }
    });
});
