import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

export interface OrderModel {
  id: string;
  quantity: number;
  item: string;
}

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {
  public orders = [] as OrderModel[];

  constructor(private _client: HttpClient) {}

  ngOnInit(): void {
    this._client.get<OrderModel[]>('orders').subscribe((orders)=>{
      this.orders = orders;
    });
  }

  public toString(order: OrderModel) {
    return JSON.stringify(order);
  }
}
