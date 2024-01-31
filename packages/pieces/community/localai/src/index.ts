import {
  PieceAuth,
  Property,
  createPiece,
} from '@activepieces/pieces-framework';
import { askLocalAI } from './lib/actions/send-prompt';
import { createCustomApiCallAction } from '@activepieces/pieces-common';

export const localaiAuth = PieceAuth.CustomAuth({
  props: {
    base_url: Property.ShortText({
      displayName: 'Server URL',
      description: 'LocalAI Instance URL',
      required: true,
    }),
    access_token: Property.ShortText({
      displayName: 'Access Token',
      description: 'LocalAI Access Token',
      required: false,
    }),
  },
  required: true,
});
export const openai = createPiece({
  displayName: 'LocalAI',
  description: 'Use LocalAi to generate text',
  minimumSupportedRelease: '0.5.0',
  logoUrl: 'https://cdn.activepieces.com/pieces/localai.jpeg',
  auth: localaiAuth,
  actions: [
    askLocalAI,
    createCustomApiCallAction({
      baseUrl: (auth) => (auth as { base_url: string }).base_url,
      auth: localaiAuth,
      authMapping: (auth) => ({
        Authorization: `Bearer ${
          (auth as { access_token: string }).access_token || ''
        }`,
      }),
    }),
  ],
  authors: ['hboujrida'],
  triggers: [],
});
