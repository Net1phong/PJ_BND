// app/api/Findorder/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest, // ใช้ NextRequest แทน Request
  { params }: { params: { id: string } } // รับ params โดยตรง
) {
  try {
    // แปลง ID พร้อมตรวจสอบความถูกต้อง
    const orderId = Number.parseInt(params.id, 10);
    
    if (Number.isNaN(orderId)) {
      return NextResponse.json(
        { 
          code: "INVALID_ID",
          message: "รหัสใบสั่งซื้อไม่ถูกต้อง"
        },
        { status: 400 }
      );
    }

    // ค้นหาข้อมูลด้วย Prisma
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            skewer: {
              select: {
                id: true,
                name: true,
                price: true,
              }
            }
          }
        }
      }
    });

    // ตรวจสอบการมีอยู่ของข้อมูล
    if (!order) {
      return NextResponse.json(
        {
          code: "ORDER_NOT_FOUND",
          message: "ไม่พบข้อมูลใบสั่งซื้อ"
        },
        { status: 404 }
      );
    }

    // ส่งกลับข้อมูลรูปแบบมาตรฐาน
    return NextResponse.json({
      success: true,
      data: {
        ...order,
        totalPrice: order.orderItems.reduce(
          (sum, item) => sum + (item.skewer.price * item.quantity),
          0
        )
      }
    });

  } catch (error) {
    // จัดการ error logging
    error

    // ส่งกลับ error response แบบมาตรฐาน
    return NextResponse.json(
      {
        code: "INTERNAL_SERVER_ERROR",
        message: "เกิดข้อผิดพลาดในระบบ"
      },
      { status: 500 }
    );
  }
}

// export async function POST(req: Request) {
//   try {
//     // ดึงข้อมูล session สำหรับลูกค้า
//     const session = await getServerSession(authOptions);
//     if (!session) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const customerId = session.user.id;

//     // รับข้อมูลจาก body: รายการสินค้ากับ paymentType
//     const {
//       items,
//       paymentType,
//     }: {
//       items: { skewerId: number; quantity: number }[];
//       paymentType: "cash" | "card" | "online";
//     } = await req.json();

//     if (items.length === 0) {
//       return NextResponse.json({ error: "Items list cannot be empty" }, { status: 400 });
//     }

//     // สร้าง Order โดยตั้งสถานะเป็น "pending"
//     const order = await prisma.order.create({
//       data: {
//         customerId,
//         totalPrice: 0, // ราคาเริ่มต้น
//         status: OrderStatus.pending, // สถานะเริ่มต้น
//       },
//     });

//     let totalPrice = 0;

//     // สร้าง OrderItem, คำนวณราคา และลดจำนวนสินค้าคงเหลือ
//     await Promise.all(
//       items.map(async (item) => {
//         // ดึงข้อมูลสินค้าจาก Skewer
//         const skewer = await prisma.skewer.findUnique({
//           where: { id: item.skewerId },
//         });
//         if (!skewer) {
//           throw new Error(`Skewer with ID ${item.skewerId} not found`);
//         }
//         if (skewer.quantity < item.quantity) {
//           throw new Error(`Not enough stock for Skewer with ID ${item.skewerId}`);
//         }
//         const price = skewer.price * item.quantity;
//         totalPrice += price;

//         // สร้าง OrderItem
//         await prisma.orderItem.create({
//           data: {
//             orderId: order.id,
//             skewerId: item.skewerId,
//             quantity: item.quantity,
//             price,
//           },
//         });

//         // ลดจำนวนสินค้าคงเหลือ
//         await prisma.skewer.update({
//           where: { id: item.skewerId },
//           data: { quantity: skewer.quantity - item.quantity },
//         });
//       })
//     );

//     const updatedOrder = await prisma.order.update({
//       where: { id: order.id },
//       data: { totalPrice },
//       select: { id: true, totalPrice: true }, // ดึงค่า totalPrice ที่อัปเดตแล้ว
//     });

//     // ส่งออเดอร์ไปยัง Pusher หลังจากอัปเดต totalPrice เสร็จ
//     await pusherServer.trigger("orders", "new-order", {
//       id: updatedOrder.id,
//       totalPrice: updatedOrder.totalPrice,
//       status: "cooking", // ส่งสถานะ 'cooking'
//     });

//     // // สร้าง Bill โดยยังไม่มี cashier (cashierId = null)
//     // const bill = await prisma.bill.create({
//     //   data: {
//     //     orderId: order.id,
//     //     totalPrice,
//     //     paymentType,
//     //     cashierId: null,
//     //   },
//     // });

//     // // สร้าง Transaction โดยยังไม่มี cashier (cashierId = null)
//     // const transaction = await prisma.transaction.create({
//     //   data: {
//     //     billId: bill.id,
//     //     amountPaid: totalPrice,
//     //     paymentType,
//     //     cashierId: null,
//     //   },
//     // });

  
//     await prisma.order.update({
//       where: { id: order.id },
//       data: { status: OrderStatus.pending },
//     });
 

//     return NextResponse.json(
//       {
//         orderId: updatedOrder.id,
//         totalPrice: updatedOrder.totalPrice,
//         billId: bill.id,
//         transactionId: transaction.id,
//         status: "cooking", // สถานะที่อัปเดต
//       },
//       { status: 201 }
//     );
//   } catch (error: any) {
//     console.error(error);
   
//     return NextResponse.json(
//       { error: error.message || "Error processing order" },
//       { status: 500 }
//     );
//   }
// }