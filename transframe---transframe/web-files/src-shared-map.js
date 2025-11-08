// src-shared-map.js

import { JoutHtml, strIcon } from './src-shared-tools.js';

export const mappers = {
  T(apiT) {
    return {
      id: apiT.tf_tagid,
      name: apiT.tf_tag,
      svgIcon: apiT.tf_svgicon,
      o: apiT.tf_o,
      _W_id: apiT.tf_Layout?.tf_layoutid,
      _WAssoc_id: apiT.tf_LayoutAssoc?.tf_layoutid
    };
  },

  C(apiC) {
    return {
      id: apiC.tf_codeid,
      name: apiC.tf_code,
      o: apiC.tf_o || '',
      _T_id: apiC.tf_Tag?.tf_tagid
    };
  },

  J(apiJ) {
    const rawStatus = apiJ["statuscode@OData.Community.Display.V1.FormattedValue"] || '';
    const status = ['reset', 'ready', 'validated', 'packed', 'batched'].includes(rawStatus.toLowerCase())
      ? 'running'
      : rawStatus.toLowerCase();

    let v = {}, out = {};
    try { v = JSON.parse(apiJ.tf_v || '{}'); } catch {}
    try { out = JSON.parse(apiJ.tf_out || '{}'); } catch {}

    return {
      id: apiJ.tf_jobid,
      name: apiJ.tf_job,
      o: apiJ.tf_o || '',
      v,
      out,
      outHtml: JoutHtml((out.pssOut || {}).value || {}),
      _srcJ_id: apiJ._tf_sourcejob_value,
      status,
      statusHtml: strIcon[status] || strIcon.clear,
      _Com_id: apiJ.tf_Com?.tf_comid,
      x: {
        _C_id: apiJ._tf_xc_value || '',
        _T_id: apiJ._tf_xt_value || ''
      },
      y: {
        _C_id: apiJ._tf_yc_value || '',
        _T_id: apiJ._tf_yt_value || ''
      },
      z: {
        _C_id: apiJ._tf_zc_value || '',
        _T_id: apiJ._tf_zt_value || ''
      }
    };
  },

  W(apiW) {
    return {
      id: apiW.tf_layoutid,
      name: apiW.tf_layout,
      nLevels: apiW.tf_levels,
      def: apiW.tf_def
    };
  },

  Com(apiCom) {
    return {
      id: apiCom.tf_comid,
      name: apiCom.tf_com,
      svgIcon: apiCom.tf_svgicon,
      _W_id: apiCom.tf_Layout?.tf_layoutid,
      _WAssoc_id: apiCom.tf_LayoutAssoc?.tf_layoutid
    };
  },

  iT(apiiT) {
    return {
      id: apiiT.tf_itagid,
      TRid: apiiT._tf_child_value,
      TLid: apiiT._tf_parent_value
    };
  },

  iC(apiiC) {
    return {
      id: apiiC.tf_icid,
      CRid: apiiC._tf_childcode_value,
      CLid: apiiC._tf_parentcode_value
    };
  }
};