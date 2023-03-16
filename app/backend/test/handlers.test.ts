import * as orderDao from '../src/order-dao';

test('Put Orders test', async ()=>{
    const result = await orderDao.putOrder({
        item: 'Bread',
        quantity: 3
    });
})