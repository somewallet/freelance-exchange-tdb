import { 
    Address, 
    beginCell, 
    Cell, 
    Contract, 
    contractAddress, 
    ContractProvider, 
    Dictionary, 
    Sender, 
    SendMode,
    toNano,  
} from 'ton-core';

import { Opcodes } from './utils/opCodes';
import { collectionsDictValue } from './utils/customDictValue';

export type MasterConfig = {
    ownerAddress: Address;
    nextCollectionIndex: number;
};

export function masterConfigToCell(config: MasterConfig): Cell {
    return beginCell()   
        .storeAddress(config.ownerAddress)
        .storeUint(config.nextCollectionIndex, 8)
        .storeDict(Dictionary.empty(Dictionary.Keys.Uint(8), collectionsDictValue))
    .endCell();
}

export class Master implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Master(address);
    }

    static createFromConfig(config: MasterConfig, code: Cell, workchain = 0) {
        const data = masterConfigToCell(config);
        const init = { code, data };
        return new Master(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
    
    async sendDeployCollection(
        provider: ContractProvider,
        via: Sender,
        opts: {
            collectionCode: Cell;
            collectionData: Cell;
        }
    ) {

        await provider.internal(via, {
            value: toNano('0.1'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.deployCollection, 32)
                .storeUint(0, 64)
                .storeRef(opts.collectionCode)
                .storeRef(opts.collectionData)
            .endCell(),
        });
    }

    async sendDeployItem(
        provider: ContractProvider,
        via: Sender,
        opts: {
            itemIndex: number;
            itemOwnerAddress: Address;
            collectionId: number;
            metadataDict: Dictionary<bigint, Cell>;
        }
    ) {
        const content = beginCell()
            .storeDict(opts.metadataDict, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        .endCell()

        const itemMessage = beginCell()
            .storeAddress(opts.itemOwnerAddress)
            .storeRef(content)
            .storeAddress(this.address)
        .endCell();

        await provider.internal(via, {
            value: toNano('0.5'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.deployNftItem, 32)
                .storeUint(0, 64)
                .storeUint(opts.collectionId, 8)
                .storeUint(opts.itemIndex, 64)
                .storeCoins(toNano('0.05'))
                .storeRef(itemMessage)
            .endCell()
        });
    }

    async sendTransferItem(
        provider: ContractProvider, 
        via: Sender,
        opts: {
            newOwner: Address;
            itemAddress: Address;
            responseAddress: Address;
            fwdAmount?: bigint;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.transferItem, 32)
                .storeUint(0, 64)
                .storeAddress(opts.itemAddress)
                .storeAddress(opts.newOwner)
                .storeAddress(opts.responseAddress)
                .storeCoins(opts.fwdAmount || 0)
            .endCell(),
        });
    }

    async sendEditItemContent(
        provider: ContractProvider, 
        via: Sender,
        opts: {
            itemAddress: Address;
            metadataDict: Dictionary<bigint, Cell>;
        }
    ) {
        const contentCell = beginCell()
            .storeDict(opts.metadataDict, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        .endCell()

        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.editItemContent, 32)
                .storeUint(0, 64)
                .storeAddress(opts.itemAddress)
                .storeRef(contentCell)
            .endCell(),
        });
    }

    async sendDestroySbt(
        provider: ContractProvider, 
        via: Sender,
        opts: {
            itemAddress: Address;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.destroySbtItem, 32)
                .storeUint(0, 64)
                .storeAddress(opts.itemAddress)
            .endCell(),
        });
    }

    async sendWithdraw(
        provider: ContractProvider, 
        via: Sender,
        opts: {
            withdrawAmount: bigint;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.withdrawFunds, 32)
                .storeUint(0, 64)
                .storeCoins(opts.withdrawAmount)
            .endCell(),
        });
    }

    async sendUpdateDappCode(
        provider: ContractProvider, 
        via: Sender,
        opts: {
            newCode: Cell;
        }
    ) {
        await provider.internal(via, {
            value: toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.editDappCode, 32)
                .storeUint(0, 64)
                .storeRef(opts.newCode)
            .endCell(),
        });
    }
}