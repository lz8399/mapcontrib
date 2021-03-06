import moment from 'moment-timezone';
import Wreqr from 'backbone.wreqr';
import Marionette from 'backbone.marionette';
import MarkedHelper from 'helper/marked';
import template from 'templates/info/layer/overPassColumn.ejs';
import LeafletHelper from 'helper/leaflet';
import Locale from 'core/locale';

export default Marionette.LayoutView.extend({
  template,

  behaviors() {
    return {
      l20n: {},
      column: {
        appendToBody: true,
        destroyOnClose: true,
        routeOnClose: this.options.previousRoute
      }
    };
  },

  ui: {
    descriptionSection: '.description_section',
    downloadBtn: '.download_btn',
    cacheSection: '.cache_section',
    cacheDate: '.cache_date',
    column: '.column',
    backButton: '.back_btn'
  },

  events: {
    'click @ui.downloadBtn': 'onClickDownload',
    'click @ui.backButton': '_onClickBack'
  },

  initialize() {
    this._radio = Wreqr.radio.channel('global');
  },

  templateHelpers() {
    const name = Locale.getLocalized(this.model, 'name');
    const description = Locale.getLocalized(this.model, 'description');

    return {
      name,
      description: MarkedHelper.render(description || '')
    };
  },

  onBeforeOpen() {
    this._radio.vent.trigger('column:closeAll', [this.cid]);
    this._radio.vent.trigger('widget:closeAll', [this.cid]);
  },

  open() {
    this.triggerMethod('open');
    return this;
  },

  close() {
    this.triggerMethod('close');
    return this;
  },

  onRender() {
    const description = Locale.getLocalized(this.model, 'description');

    if (description) {
      this.ui.descriptionSection.removeClass('hide');
    }

    const cache = this.model.get('cache');
    const cacheUpdateSuccess = this.model.get('cacheUpdateSuccess');
    const cacheUpdateSuccessDate = this.model.get('cacheUpdateSuccessDate');

    if (cache && cacheUpdateSuccess && cacheUpdateSuccessDate) {
      this.ui.cacheSection.removeClass('hide');

      if (cacheUpdateSuccessDate) {
        moment.locale(Locale.getLocale());

        const timezone = moment.tz.guess();
        const date = moment.utc(cacheUpdateSuccessDate).tz(timezone).fromNow();

        this.ui.cacheDate
          .html(
            document.l10n.getSync('infoLayerColumn_layerOverPassCacheDate', {
              date
            })
          )
          .removeClass('hide');
      }
    }
  },

  onClickDownload(e) {
    e.preventDefault();

    const markerCluster = this._radio.reqres.request(
      'map:markerCluster',
      this.model
    );
    const name = Locale.getLocalized(this.model, 'name');
    const layerName = name || document.l10n.getSync('mapcontrib');
    const fileName = `${layerName}.geojson`;

    LeafletHelper.downloadGeoJsonFromLayer(markerCluster, fileName);
  },

  _onClickBack() {
    this.options.router.navigate('select/layer', true);
  }
});
