// src-shared-map.js

import { JoutHtml, strIcon } from './src-shared-tools.js';

export const mappers = {
  T(obj) {
    const {
      tf_tagid, tf_tag, tf_svgicon, tf_o,
      tf_Layout, tf_LayoutAssoc
    } = obj;

    return {
      id: tf_tagid,
      name: tf_tag,
      svgIcon: tf_svgicon,
      o: tf_o,
      _W_id: tf_Layout?.tf_layoutid,
      _WAssoc_id: tf_LayoutAssoc?.tf_layoutid
    };
  },

  C(obj) {
    const { tf_codeid, tf_code, tf_o, tf_Tag } = obj;

    return {
      id: tf_codeid,
      name: tf_code,
      o: tf_o || '',
      _T_id: tf_Tag?.tf_tagid
    };
  },

  J(obj) {
    const {
      tf_jobid, tf_job, tf_o, tf_v, tf_out,
      _tf_sourcejob_value, _tf_com_value,
      _tf_xc_value, _tf_xt_value,
      _tf_yc_value, _tf_yt_value,
      _tf_zc_value, _tf_zt_value,
      statuscode
    } = obj;

    const rawStatus = statuscode?.['@OData.Community.Display.V1.FormattedValue'] || '';
    const status = ['reset', 'ready', 'validated', 'packed', 'batched'].includes(rawStatus.toLowerCase())
      ? 'running'
      : rawStatus.toLowerCase();

    let v = {}, out = {};
    try { v = JSON.parse(tf_v || '{}'); } catch {}
    try { out = JSON.parse(tf_out || '{}'); } catch {}

    return {
      id: tf_jobid,
      name: tf_job,
      o: tf_o || '',
      v,
      out,
      outHtml: JoutHtml((out.pssOut || {}).value || ''),
      _srcJ_id: _tf_sourcejob_value,
      status,
      statusHtml: strIcon[status] || strIcon.clear,
      _com_id: _tf_com_value,
      x: { _C_id: _tf_xc_value || '', _T_id: _tf_xt_value || '' },
      y: { _C_id: _tf_yc_value || '', _T_id: _tf_yt_value || '' },
      z: { _C_id: _tf_zc_value || '', _T_id: _tf_zt_value || '' }
    };
  },

  W(obj) {
    const { tf_layoutid, tf_layout, tf_levels, tf_def } = obj;

    return {
      id: tf_layoutid,
      name: tf_layout,
      nLevels: tf_levels,
      def: tf_def
    };
  },

  Com(obj) {
    const {
      tf_comid, tf_com, tf_svgicon,
      tf_Layout, tf_LayoutAssoc
    } = obj;

    return {
      id: tf_comid,
      name: tf_com,
      svgIcon: tf_svgicon,
      _W_id: tf_Layout?.tf_layoutid,
      _WAssoc_id: tf_LayoutAssoc?.tf_layoutid
    };
  },

  iT(obj) {
    const { tf_itagid, _tf_child_value, _tf_parent_value } = obj;

    return {
      id: tf_itagid,
      _TR_id: _tf_child_value,
      _TL_id: _tf_parent_value
    };
  },

  iC(obj) {
    const { tf_icid, _tf_childcode_value, _tf_parentcode_value } = obj;

    return {
      id: tf_icid,
      _CR_id: _tf_childcode_value,
      _CL_id: _tf_parentcode_value
    };
  }
};