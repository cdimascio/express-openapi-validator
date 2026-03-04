import * as path from 'path';
import * as request from 'supertest';
import { expect } from 'chai';
import { createApp } from './common/app';
import { AppWithServer } from './common/app.common';

const apiSpec = path.join('test', 'resources', 'multiple-validations.yaml');

// A handler that writes a too-long value back so the response validator fires.
const defineRoutes = (app: AppWithServer) => {
  app.post(`${app.basePath}/persons`, (req, res) => {
    res.json({ success: true });
  });
  app.get(`${app.basePath}/persons`, (req, res) => {
    // Deliberately echo the raw query value so the response schema
    // (Person with bname maxLength:10 / format:starts-with-b) rejects it.
    res.json({ bname: req.query.bname });
  });
};

describe('i18n – ajvLocale', () => {
  describe('static string locale', () => {
    let app: AppWithServer;

    before(async () => {
      app = await createApp(
        {
          apiSpec,
          formats: { 'starts-with-b': (v) => /^b/i.test(v) },
          ajvLocale: 'de',
          validateRequests: { allErrors: true },
          validateResponses: { allErrors: true },
        },
        3008,
        defineRoutes,
        true,
      );
    });

    after(() => app.server.close());

    it('request errors should be in German when ajvLocale is "de"', async () => {
      const res = await request(app)
        .post(`${app.basePath}/persons`)
        .set('content-type', 'application/json')
        .send({ bname: 'Maximillian' }) // violates maxLength:10
        .expect(400);

      // German AJV messages contain German keywords – at minimum they must
      // differ from the English defaults ("must NOT have more than").
      const messages: string[] = res.body.errors.map((e) => e.message);
      expect(messages.length).to.be.greaterThan(0);
      // English default would be "must NOT have more than 10 characters" –
      // German equivalent starts with "darf höchstens" or similar.
      messages.forEach((msg) => {
        expect(msg).to.not.match(/must NOT have more than/i);
      });
    });

    it('response errors should be in German when ajvLocale is "de"', async () => {
      const res = await request(app)
        .get(`${app.basePath}/persons?bname=Maximillian`)
        .expect(500);

      const messages: string[] = res.body.errors.map((e) => e.message);
      expect(messages.length).to.be.greaterThan(0);
      messages.forEach((msg) => {
        expect(msg).to.not.match(/must NOT have more than/i);
      });
    });
  });

  describe('function locale', () => {
    let app: AppWithServer;
    let currentLocale = 'de';

    before(async () => {
      app = await createApp(
        {
          apiSpec,
          formats: { 'starts-with-b': (v) => /^b/i.test(v) },
          ajvLocale: () => currentLocale,
          validateRequests: { allErrors: true },
          validateResponses: { allErrors: true },
        },
        3009,
        defineRoutes,
        true,
      );
    });

    after(() => app.server.close());

    it('should use German messages when locale function returns "de"', async () => {
      currentLocale = 'de';
      const res = await request(app)
        .post(`${app.basePath}/persons`)
        .set('content-type', 'application/json')
        .send({ bname: 'Maximillian' })
        .expect(400);

      const messages: string[] = res.body.errors.map((e) => e.message);
      expect(messages.length).to.be.greaterThan(0);
      messages.forEach((msg) => {
        expect(msg).to.not.match(/must NOT have more than/i);
      });
    });

    it('should use Russian messages when locale function returns "ru"', async () => {
      currentLocale = 'ru';
      const res = await request(app)
        .post(`${app.basePath}/persons`)
        .set('content-type', 'application/json')
        .send({ bname: 'Maximillian' })
        .expect(400);

      const messages: string[] = res.body.errors.map((e) => e.message);
      expect(messages.length).to.be.greaterThan(0);
      messages.forEach((msg) => {
        expect(msg).to.not.match(/must NOT have more than/i);
      });
    });
  });

  describe('no locale (default English)', () => {
    let app: AppWithServer;

    before(async () => {
      app = await createApp(
        {
          apiSpec,
          formats: { 'starts-with-b': (v) => /^b/i.test(v) },
          validateRequests: { allErrors: true },
        },
        3010,
        defineRoutes,
        true,
      );
    });

    after(() => app.server.close());

    it('should return English messages when no ajvLocale is set', async () => {
      const res = await request(app)
        .post(`${app.basePath}/persons`)
        .set('content-type', 'application/json')
        .send({ bname: 'Maximillian' })
        .expect(400);

      const messages: string[] = res.body.errors.map((e) => e.message);
      expect(messages.length).to.be.greaterThan(0);
      // At least one error should contain the English AJV message text.
      const hasEnglish = messages.some((msg) =>
        /must NOT have more than/i.test(msg),
      );
      expect(hasEnglish).to.be.true;
    });
  });

  describe('unknown locale key', () => {
    let app: AppWithServer;

    before(async () => {
      app = await createApp(
        {
          apiSpec,
          formats: { 'starts-with-b': (v) => /^b/i.test(v) },
          ajvLocale: 'xx-UNKNOWN',
          validateRequests: { allErrors: true },
        },
        3011,
        defineRoutes,
        true,
      );
    });

    after(() => app.server.close());

    it('should not throw and should return English messages for an unknown locale', async () => {
      const res = await request(app)
        .post(`${app.basePath}/persons`)
        .set('content-type', 'application/json')
        .send({ bname: 'Maximillian' })
        .expect(400);

      const messages: string[] = res.body.errors.map((e) => e.message);
      expect(messages.length).to.be.greaterThan(0);
      const hasEnglish = messages.some((msg) =>
        /must NOT have more than/i.test(msg),
      );
      expect(hasEnglish).to.be.true;
    });
  });

  describe('function locale returning undefined', () => {
    let app: AppWithServer;

    before(async () => {
      app = await createApp(
        {
          apiSpec,
          formats: { 'starts-with-b': (v) => /^b/i.test(v) },
          ajvLocale: () => undefined,
          validateRequests: { allErrors: true },
        },
        3012,
        defineRoutes,
        true,
      );
    });

    after(() => app.server.close());

    it('should not throw and should return English messages when locale function returns undefined', async () => {
      const res = await request(app)
        .post(`${app.basePath}/persons`)
        .set('content-type', 'application/json')
        .send({ bname: 'Maximillian' })
        .expect(400);

      const messages: string[] = res.body.errors.map((e) => e.message);
      expect(messages.length).to.be.greaterThan(0);
      const hasEnglish = messages.some((msg) =>
        /must NOT have more than/i.test(msg),
      );
      expect(hasEnglish).to.be.true;
    });
  });
});
