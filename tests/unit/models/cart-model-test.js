import { module, test } from 'qunit';
import CartModel from 'js-buy-sdk/models/cart-model';
import BaseModel from 'js-buy-sdk/models/base-model';
import assign from 'js-buy-sdk/metal/assign';
import { cartFixture } from '../../fixtures/cart-fixture';

let model;

module('Unit | CartModel', {
  setup() {
    const shopClient = {
      update(type, updatedModel) {
        return new Promise(function (resolve) {
          resolve(new CartModel(assign({}, updatedModel.attrs), { shopClient }));
        });
      }
    };

    model = new CartModel(assign({}, cartFixture.checkout), { shopClient });
    model.attrs.line_items = model.attrs.line_items.slice(0);
  }
});

test('it extends from BaseModel', function (assert) {
  assert.expect(1);

  assert.ok(BaseModel.prototype.isPrototypeOf(model));
});

test('it proxies `lineItems` to the underlying line items', function (assert) {
  assert.expect(1);

  assert.deepEqual(model.lineItems, cartFixture.checkout.line_items);
});

test('it proxies sub total from the underlying checkout', function (assert) {
  assert.expect(1);

  assert.equal(model.subTotal, cartFixture.checkout.subtotal_price);
});

test('it creates a line item when you add a variant', function (assert) {
  assert.expect(3);

  const done = assert.async();

  const id = 12345;
  const quantity = 2;

  model.addVariants({ id, quantity }).then(cart => {
    assert.equal(cart, model, 'it should be the same model, with updated attrs');
    assert.equal(cart.lineItems.length, 2);
    assert.equal(cart.lineItems.filter(item => {
      return item.variant_id === id && item.quantity === quantity;
    }).length, 1, 'the line item exists');

    done();
  }).catch(() => {
    assert.ok(false, 'promise should not reject');
    done();
  });
});

test('it updates line item quantities', function (assert) {
  assert.expect();

  const done = assert.async();

  const id = model.lineItems[0].id;
  const quantity = 4;

  model.updateLineItem(id, quantity).then(cart => {
    assert.equal(cart, model, 'it should be the same model, with updated attrs');
    assert.equal(cart.lineItems.length, 1, 'it doesn\'t create a new line item');
    assert.equal(cart.lineItems[0].quantity, quantity);

    done();
  }).catch(() => {
    assert.ok(false, 'promise should not reject');
    done();
  });
});

test('it removes a single line item by id', function (assert) {
  assert.expect();

  const done = assert.async();

  const id = model.lineItems[0].id;

  model.removeLineItem(id).then(cart => {
    assert.equal(cart, model, 'it should be the same model, with updated attrs');
    assert.equal(cart.lineItems.length, 0, 'it removes the only line item');
    done();
  }).catch(() => {
    assert.ok(false, 'promise should not reject');
    done();
  });
});


test('it removes all line items', function (assert) {
  assert.expect(2);

  const done = assert.async();

  model.clearLineItems().then(cart => {
    assert.equal(cart, model, 'it should be the same model, with updated attrs');
    assert.deepEqual(cart.lineItems, [], 'it removes all line items');
    done();
  }).catch(() => {
    assert.ok(false, 'promise should not reject');
    done();
  });
});

test('it dedupes line items with the same variant_id when added together', function (assert) {
  assert.expect(3);

  const done = assert.async();

  const id = 12345;
  const quantity = 1;

  model.addVariants({ id, quantity }, { id, quantity }).then(cart => {
    assert.equal(cart, model, 'it should be the same model, with updated attrs');
    assert.equal(cart.lineItems.length, 2);
    assert.equal(cart.lineItems.filter(item => {
      return item.variant_id === id && item.quantity === (quantity * 2);
    }).length, 1, 'the line item exists with summed quantities');

    done();
  }).catch(() => {
    assert.ok(false, 'promise should not reject');
    done();
  });
});

test('it dedupes line items with the same variant_id when added one after another', function (assert) {
  assert.expect(3);

  const done = assert.async();

  const id = cartFixture.checkout.line_items[0].variant_id;
  const quantity = 1;
  const summedQuantity = quantity + cartFixture.checkout.line_items[0].quantity;
  const properties = assign({}, cartFixture.checkout.line_items[0].properties);

  model.addVariants({ id, quantity, properties }).then(cart => {
    assert.equal(cart, model, 'it should be the same model, with updated attrs');
    assert.equal(cart.lineItems.length, 1, 'we\'re adding to the existing line_item');
    assert.equal(cart.lineItems.filter(item => {
      return item.variant_id === id && item.quantity === summedQuantity;
    }).length, 1, 'the line item exists with summed quantities');

    done();
  }).catch(() => {
    assert.ok(false, 'promise should not reject');
    done();
  });
});

test('it treats line_items with same variant_ids and different properties as different', function (assert) {
  assert.expect(4);

  const done = assert.async();

  const id = 12345;
  const quantity = 1;
  const propertiesOne = { prop: 'engraving="awesome engraving"' };
  const propertiesTwo = { prop: 'custom_color=shmurple' };
  const items = [{
    id,
    quantity,
    properties: propertiesOne
  }, {
    id,
    quantity,
    properties: propertiesTwo
  }];

  model.addVariants(...items).then(cart => {
    assert.equal(cart, model, 'it should be the same model, with updated attrs');
    assert.equal(cart.lineItems.length, 3);
    assert.equal(cart.lineItems.filter(item => {
      return item.variant_id === id && item.quantity === quantity && item.properties === propertiesOne;
    }).length, 1, 'line item with props one exists');
    assert.equal(cart.lineItems.filter(item => {
      return item.variant_id === id && item.quantity === quantity && item.properties === propertiesTwo;
    }).length, 1, 'line item with props two exists');

    done();
  }).catch(() => {
    assert.ok(false, 'promise should not reject');
    done();
  });
});

test('it removes the line item if the quantity isn\'t at least one', function (assert) {
  assert.expect(2);

  const done = assert.async();

  const id = model.lineItems[0].id;
  const quantity = 0;

  model.updateLineItem(id, quantity).then(cart => {
    assert.equal(cart, model, 'it should be the same model, with updated attrs');
    assert.equal(cart.lineItems.length, 0, 'it doesn\'t create a new line item');

    done();
  }).catch(() => {
    assert.ok(false, 'promise should not reject');
    done();
  });
});