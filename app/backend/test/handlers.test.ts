import * as orderDao from '../src/order-dao';

test('Put Orders test', async ()=>{
    const result = await orderDao.createOrder({
        item: 'Bread',
        quantity: 3
    });
})