import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { EthereumService, BitcoinService } from './app.service';
import { PrismaService } from './prisma.service';
import CryptoConvert from 'crypto-convert';
import { formatEther } from 'viem';

type MessageDTO = {
  totalAmount: number;
  paymentMethod: string;
  productData: {
    Name: string;
    Description: string;
    Url: string;
  }[];
};

type CheckStatusDTO = {
  InvoiceID: string;
  Method: string;
};

type UpdateDTO = {
  InvoiceID: string;
  Method: string;
  TemporaryAddress: `0x${string}`;
};

@Controller()
export class AppController {
  constructor(
    private ethereumService: EthereumService,
    private bitcoinService: BitcoinService,
    private prisma: PrismaService,
  ) {}

  @Post('/api/checkstatus')
  async checkStatus(@Body() messageBody: CheckStatusDTO) {
    var walletBalance: bigint;

    const findInvoice = await this.prisma.invoice.findUnique({
      where: {
        ID: messageBody.InvoiceID,
      },
    });

    switch (messageBody.Method) {
      case 'ETH':
        walletBalance = await this.ethereumService.checkWalletBalance(
          findInvoice.Address as `0x${string}`,
        );
        break;
      case 'BNB':
        '';
        break;
      case 'MATIC':
        '';
        break;
      default:
        throw new Error('Method not Found');
    }

    if (findInvoice.CoinAmount === walletBalance) {
      await this.prisma.invoice.update({
        where: {
          ID: messageBody.InvoiceID,
        },
        data: {
          Paid: true,
        },
      });

      try {
        await this.ethereumService.sendFromWallet(
          findInvoice.mnemonicStr,
          '0x607845D4FAEc83B50e951D98a8396b1364FF7003',
        );
      } catch (e) {
        console.log(e);
        return {
          statusCode: 420,
          paymentStatus: 'Insufficient Funds',
        };
      }

      return {
        statusCode: 200,
        paymentStatus: 'Paid',
      };
    } else {
      return {
        statusCode: 200,
        paymentStatus: 'Not Paid',
      };
    }
  }

  @Post('/api/invoice/create')
  async postInvoice(@Body() messageBody: MessageDTO): Promise<string> {
    console.log(messageBody);
    const convert = new CryptoConvert({});
    await convert.ready();
    const getAmount = convert.USD.ETH(messageBody.totalAmount) as number;
    const mnemonicPhrase = this.ethereumService.generateMnemonicPhrase();
    const createdInvoice = await this.prisma.invoice.create({
      data: {
        Amount: messageBody.totalAmount.toString(),
        Paid: false,
        Method: 'ETH',
        Expiry: (Date.now() + 5400).toString(),
        mnemonicStr: mnemonicPhrase,
        Address: await this.ethereumService.getWalletAddress(mnemonicPhrase),
        CoinAmount: getAmount * Math.pow(10, 18),
      },
    });

    return JSON.stringify({
      ID: createdInvoice.ID,
      Address: createdInvoice.Address as `0x${string}`,
      Amount: createdInvoice.Amount,
      CoinAmount: formatEther(createdInvoice.CoinAmount),
      Method: createdInvoice.Method,
      Paid: createdInvoice.Paid,
    });
  }

  @Patch('/api/invoice/update')
  async updateInvoice(@Body() messageBody: UpdateDTO): Promise<{
    ID: string;
    Paid: boolean;
    Amount: string;
    Method: string;
    Address: `0x${string}`;
    CoinAmount: string;
  }> {
    const convert = new CryptoConvert({});
    await convert.ready();

    const findInvoice = await this.prisma.invoice.findUnique({
      where: {
        ID: messageBody.InvoiceID,
      },
    });

    const updatedInvoice = await this.prisma.invoice.update({
      where: {
        ID: messageBody.InvoiceID,
      },
      data: {
        Method: messageBody.Method,
        CoinAmount: eval(
          `convert.USD.${messageBody.Method}.(${findInvoice.Amount})`,
        ),
      },
    });

    return {
      ID: updatedInvoice.ID,
      Address: updatedInvoice.Address as `0x${string}`,
      Amount: updatedInvoice.Amount,
      CoinAmount: formatEther(updatedInvoice.CoinAmount),
      Method: updatedInvoice.Method,
      Paid: updatedInvoice.Paid,
    };
  }
}
