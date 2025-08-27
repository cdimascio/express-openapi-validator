import * as path from 'path';
import { expect } from 'chai';
import * as request from 'supertest';
import { createApp } from './common/app';
import { AppWithServer } from './common/app.common';

type Op =
  | {
      type: 'create_screen';
      data: {
        key: string;
        titleTranslationKey: string;
        type: 'normal' | 'intermediate';
        step?: string;
        descriptionTranslationKey?: string;
        description?: string;
      };
    }
  | {
      type: 'update_screen';
      data: {
        id: string;
        props: {
          key?: string;
          titleTranslationKey?: string;
          type?: 'normal' | 'intermediate';
          step?: string;
          descriptionTranslationKey?: string;
          description?: string;
        };
      };
    }
  | {
      type: 'create_question';
      data: {
        key: string;
        titleTranslationKey: string;
        uiElementType: string;
        valueType: string;
      };
    }
  | {
      type: 'update_question';
      data: {
        id: string;
        props: {
          key?: string;
          titleTranslationKey?: string;
          uiElementType?: string;
          valueType?: string;
        };
      };
    };

const postOps = (app: any, op: Op) =>
  request(app)
    .post(`${app.basePath}/operations`)
    .set('content-type', 'application/json')
    .send({ operations: [op] })
    .expect(204);

describe('Operation discriminator', () => {
  let app: AppWithServer;

  before(async () => {
    const apiSpec = path.join('test', 'resources', 'discriminator.yaml');
    app = await createApp(
      { apiSpec, validateRequests: { discriminator: true, allErrors: true } },
      3001,
      (app) => {
        app.post(`${app.basePath}/operations`, (req, res) => {
          res.status(204).send();
        });
      },
    );
  });

  after(() => {
    app.server.close();
  });

  describe('/operations', () => {
    const cases: Array<[string, Op]> = [
      [
        'create_screen',
        {
          type: 'create_screen',
          data: {
            key: 'test_screen',
            titleTranslationKey: 'screen.test.title',
            type: 'normal',
            step: 'step1',
          },
        },
      ],
      [
        'update_screen',
        {
          type: 'update_screen',
          data: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            props: {
              key: 'updated_screen',
              titleTranslationKey: 'screen.updated.title',
              type: 'intermediate',
              step: 'step2',
            },
          },
        },
      ],
      [
        'create_question',
        {
          type: 'create_question',
          data: {
            key: 'test_question',
            titleTranslationKey: 'question.test.title',
            uiElementType: 'input',
            valueType: 'string',
          },
        },
      ],
      [
        'update_question',
        {
          type: 'update_question',
          data: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            props: {
              key: 'updated_question',
              titleTranslationKey: 'question.updated.title',
              uiElementType: 'checkbox',
              valueType: 'boolean',
            },
          },
        },
      ],
    ];

    for (const [name, op] of cases) {
      it(`should return 204 for valid ${name} operation`, async function () {
        const res = await postOps(app, op);
        expect(res.status).to.equal(204);
      });
    }

    it('should return 400 for invalid discriminator type', async () =>
      request(app)
        .post(`${app.basePath}/operations`)
        .set('content-type', 'application/json')
        .send({
          operations: [
            {
              type: 'invalid_operation',
              data: {
                key: 'test',
                titleTranslationKey: 'test',
                type: 'normal',
                step: 'step1',
              },
            },
          ],
        })
        .expect(400)
        .then((r) => {
          expect(r.body.errors).to.have.lengthOf(1);

          const [error] = r.body.errors;

          expect(error.path).to.include('/body/operations/0');
          expect(error.message).to.match(
            /value of tag "type" must be in oneOf/,
          );
          expect(error.errorCode).to.equal('discriminator.openapi.validation');
        }));

    it('should return 400 for create_screen operation with missing required fields', async () =>
      request(app)
        .post(`${app.basePath}/operations`)
        .set('content-type', 'application/json')
        .send({
          operations: [
            {
              type: 'create_screen',
              data: {
                key: 'test_screen',
                // missing titleTranslationKey, type, step
              },
            },
          ],
        })
        .expect(400)
        .then((r) => {
          const expected = [
            {
              path: '/body/operations/0/data/titleTranslationKey',
              message: "must have required property 'titleTranslationKey'",
              errorCode: 'required.openapi.validation',
            },
            {
              path: '/body/operations/0/data/type',
              message: "must have required property 'type'",
              errorCode: 'required.openapi.validation',
            },
            {
              path: '/body/operations/0/data/step',
              message: "must have required property 'step'",
              errorCode: 'required.openapi.validation',
            },
          ];

          const errors = r.body.errors.map(({ path, message, errorCode }) => ({
            path,
            message,
            errorCode,
          }));

          expect(errors).to.have.lengthOf(expected.length);
          expect(errors).to.have.deep.members(expected);
        }));
  });
});
