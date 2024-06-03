import { wedofAuth } from '../../..';
import { httpClient ,HttpMethod } from '@activepieces/pieces-common';
import { createTrigger, TriggerStrategy } from '@activepieces/pieces-framework';
import { wedofCommon } from '../../common/wedof';

export const certificationFolderTotake = createTrigger({
    auth: wedofAuth,
    name: 'certificationFolderTotake',
    displayName: 'Dossier de certification prêt à passer',
    description: "Se déclenche Lorsqu'un dossier de certification est prét à passer",
    props: {},
    sampleData: {},
    type: TriggerStrategy.WEBHOOK,
    async onEnable(context){
        const url = context.webhookUrl as string;
        const name =
          'Activepieces - CertificationFolderTotake - ' +
          url.substring(url.lastIndexOf('/') + 1);
    
        const message = {
          url: context.webhookUrl,
          events: ['certificationFolder.toTake'],
          name: name,
          secret: null,
          enabled: true,
          ignoreSsl: false,
        };
    
        const id = await context.store.get('_webhookId');
    
        if (id === null) {
          const response = await httpClient.sendRequest({
            method: HttpMethod.POST,
            url: wedofCommon.baseUrl + '/webhooks',
            body: message,
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': context.auth as string,
            },
          });
    
          await context.store.put('_webhookId', response.body.id);
        } else {
          console.log('/////////// webhook already exist ////');
        }
    },
    async onDisable(context){
        const id = await context.store.get('_webhookId');

        await httpClient.sendRequest({
          method: HttpMethod.DELETE,
          url: wedofCommon.baseUrl + '/webhooks/' + id,
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': context.auth as string,
          },
        });
        await context.store.delete('_webhookId');
    },
    async run(context){
        return [context.payload.body]
    }
})