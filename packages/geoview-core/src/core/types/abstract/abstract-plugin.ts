import { TypePluginOptions } from '../cgpv-types';

export abstract class AbstractPluginClass {
  // id of the plugin
  id: string;

  // plugin properties
  pluginOptions: TypePluginOptions;

  constructor(id: string, props: TypePluginOptions) {
    this.id = id;
    this.pluginOptions = props;
  }
}
