
import moment from 'moment-timezone';
import Locale from 'core/locale';
import Wreqr from 'backbone.wreqr';
import Marionette from 'backbone.marionette';
import MarkedHelper from 'helper/marked';
import template from 'templates/infoOverPassLayerColumn.ejs';
import LeafletHelper from 'helper/leaflet';


export default Marionette.LayoutView.extend({
    template: template,

    behaviors: {
        'l20n': {},
        'column': {
            'appendToBody': true,
        },
    },

    ui: {
        'descriptionSection': '.description_section',
        'downloadBtn': '.download_btn',
        'cacheSection': '.cache_section',
        'cacheDate': '.cache_date',
        'column': '#info_overpass_layer_column',
    },

    events: {
        'click @ui.downloadBtn': 'onClickDownload',
    },

    initialize(options) {
        this._radio = Wreqr.radio.channel('global');
    },

    templateHelpers() {
        return {
            'description': MarkedHelper.render( this.model.get('description') || '' ),
        };
    },

    onBeforeOpen() {
        this._radio.vent.trigger('column:closeAll', [ this.cid ]);
        this._radio.vent.trigger('widget:closeAll', [ this.cid ]);
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
        if ( this.model.get('description') ) {
            this.ui.descriptionSection.removeClass('hide');
        }

        const cache = this.model.get('cache');
        const cacheUpdateSuccess = this.model.get('cacheUpdateSuccess');
        const cacheUpdateSuccessDate = this.model.get('cacheUpdateSuccessDate');

        if ( cache && cacheUpdateSuccess && cacheUpdateSuccessDate ) {
            this.ui.cacheSection.removeClass('hide');

            if ( cacheUpdateSuccessDate ) {
                moment.locale(
                    Locale.getLocale()
                );

                const timezone = moment.tz.guess();
                const date = moment.utc(
                    cacheUpdateSuccessDate
                )
                .tz(timezone)
                .fromNow();

                this.ui.cacheDate
                .html(
                    document.l10n.getSync(
                        'infoLayerColumn_layerOverPassCacheDate',
                        { date }
                    )
                )
                .removeClass('hide');
            }
        }
    },

    onClickDownload(e) {
        e.preventDefault();

        const markerCluster = this._radio.reqres.request('map:markerCluster', this.model);
        const layerName = this.model.get('name') || document.l10n.getSync('mapcontrib');
        const fileName = `${layerName}.geojson`;

        LeafletHelper.downloadGeoJsonFromLayer(markerCluster, fileName);
    },
});
