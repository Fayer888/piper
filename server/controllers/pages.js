const authorize = require('../lib/authorize');
const __ = require('../constants');
const createby = require('../lib/createby');

module.exports = class {
  static url = '/pages';

  @authorize(['EDIT'])
  static async get(ctx) {
    let result = await ctx.sql('\
      SELECT `id`, `title`, `create_by`, `create_at`, `update_at`, `publish_at` \
        FROM `pages` WHERE `is_delete` = 0 \
    ');
    await createby(result);
    ctx.body = result;
  }

  @authorize(['CHANGE'])
  static async post(ctx) {
    let { title = '', config = '', items = '' } = ctx.request.body;
    title = title.trim();
    if (!title) throw { status: 400, name: 'ERROR_PARAMS', message: 'Title 不能为空' };
    items = JSON.stringify(items);
    if (items.length > __.VALUE_MAX_LENGTH) throw __.VALUE_TOO_LONG;
    config = JSON.stringify(config);

    let data;
    await ctx.sql.commit(async () => {

      let pages = await ctx.sql(
        'SELECT 1 FROM `pages` WHERE `is_delete` = 0 AND `title` = ? FOR UPDATE',
        [ title ]
      );
      if (pages.length) throw { status: 400, name: 'DUP', message: '记录已存在' };

      data = await ctx.sql(
        'INSERT INTO `pages` (`title`, `config`, `items`, `create_by`) VALUES (?)',
        [ [ title, config, items, ctx.user.id ] ]
      );

      await ctx.sql(
        'INSERT INTO `changelog` (`action`, `page_id`, `items`, `create_by`) VALUES (?)',
        [ [ 1, data.insertId, items, ctx.user.id ] ]
      );

    });

    ctx.body = {
      message: 'Save success',
      item: data
    };
  }

};
