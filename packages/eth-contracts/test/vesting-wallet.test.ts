import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { RedstoneToken, StakingRegistry, VestingWallet } from "../typechain-types";
import { time } from "../src/utils";

describe("Vesting Wallet", () => {
  let token: RedstoneToken,
    wallet: VestingWallet,
    staking: StakingRegistry,
    signers: SignerWithAddress[],
    authorisedStakeSlasher: SignerWithAddress,
    beneficiary: SignerWithAddress,
    now: number = Math.floor(new Date().getTime() / 1000);

  const deployContracts = async (
    lockPeriodForUnstakingInSeconds: number = 100000, 
    allocation:number = 100, start:number = 0, cliffDuration:number = 100, vestingDuration:number = 100
  ) => {
    signers = await ethers.getSigners();
    beneficiary = signers[1];
    authorisedStakeSlasher = signers[2];
    
    // Deploy token contract
    const TokenContractFactory = await ethers.getContractFactory(
      "RedstoneToken"
    );
    token = await TokenContractFactory.deploy(1000);
    await token.deployed();

    // Deploy staking contract
    const StakingRegistryFactory = await ethers.getContractFactory(
        "StakingRegistry"
      );
      staking = await StakingRegistryFactory.deploy(
        token.address,
        await authorisedStakeSlasher.getAddress(),
        lockPeriodForUnstakingInSeconds
      );
      await staking.deployed();

    // Deploy wallet
    const VestingWalletFactory = await ethers.getContractFactory("VestingWallet");
    wallet = await VestingWalletFactory.deploy(
        token.address,
        beneficiary.address,
        staking.address,
        allocation, 
        start, 
        cliffDuration, 
        vestingDuration
    );
    await wallet.deployed();

    await token.transfer(wallet.address, allocation);
  };

  beforeEach(() =>{
    now += 1000;
  });

  describe("No external funding", () => {

    it("Should not release before start", async () => {
        await deployContracts(100, 100, now + 10, 100, 100);
        expect(await wallet.getReleasable()).to.eq(0);

        await expect(wallet.release(1))
            .to.be.revertedWith("VestingWallet: there is not enough tokens to release");          
    });

    it("Should not release before end of the cliff", async () => {
        await deployContracts(100, 100, now + 10, 100, 100);
        expect(await wallet.getReleasable()).to.eq(0);

        await expect(wallet.release(1))
            .to.be.revertedWith("VestingWallet: there is not enough tokens to release");
    });

    it("Should release in the 1/4 of vesting", async () => {
        await time.setTimeAndMine(now);
        await deployContracts(100, 100, now + 10, 100, 100);

        expect(await token.balanceOf(beneficiary.address)).to.eq(0);

        await time.setTime(now + 10 + 100 + 25);
        await wallet.release(25);
        expect(await token.balanceOf(beneficiary.address)).to.eq(25);

        expect(await wallet.getReleasable()).to.eq(0);
    });

    it("Should release in the 1/2 of vesting", async () => {
        await time.setTimeAndMine(now);
        await deployContracts(100, 100, now + 10, 100, 100);

        expect(await token.balanceOf(beneficiary.address)).to.eq(0);

        await time.setTime(now + 10 + 100 + 50);
        await wallet.release(50);
        expect(await token.balanceOf(beneficiary.address)).to.eq(50);

        expect(await wallet.getReleasable()).to.eq(0);
    });

    it("Should release in the 3/4 of vesting", async () => {
        await time.setTime(now);
        await deployContracts(100, 100, now + 10, 100, 100);

        expect(await token.balanceOf(beneficiary.address)).to.eq(0);

        await time.setTime(now + 10 + 100 + 75);

        await wallet.release(75);
        expect(await token.balanceOf(beneficiary.address)).to.eq(75);

        expect(await wallet.getReleasable()).to.eq(0);
    });

    it("Should release in the all of vesting at the end of vesting period", async () => {
        await time.setTime(now);
        await deployContracts(100, 100, now + 10, 100, 100);

        expect(await token.balanceOf(beneficiary.address)).to.eq(0);

        await time.setTime(now + 10 + 100 + 100);

        await wallet.release(100);
        expect(await token.balanceOf(beneficiary.address)).to.eq(100);

        expect(await wallet.getReleasable()).to.eq(0);
    });

    it("Should release in the all of vesting after the vesting period", async () => {
        await time.setTime(now);
        await deployContracts(100, 100, now + 10, 100, 100);

        expect(await token.balanceOf(beneficiary.address)).to.eq(0);

        await time.setTime(now + 10 + 100 + 200);

        await wallet.release(100);
        expect(await token.balanceOf(beneficiary.address)).to.eq(100);

        expect(await wallet.getReleasable()).to.eq(0);
    });

  });

  describe("With external funding", () => {

    it("Should release additional tokens before start", async () => {
        await deployContracts(100, 100, now + 10, 100, 100);

        await token.transfer(wallet.address, 10);
        expect(await wallet.getReleasable()).to.eq(10);

        await wallet.release(10);
        expect(await token.balanceOf(beneficiary.address)).to.eq(10);

        expect(await wallet.getReleasable()).to.eq(0);        
    });
    
    it("Should allow moving funds to approved contracts", async () => {
        await deployContracts(100, 100, now + 10, 100, 100);
        expect(await wallet.getReleasable()).to.eq(0);

        await wallet.stake(20);

        expect(await staking.getStakedBalance(wallet.address)).to.eq(20);
    });

    it("Should allow moving funds to approved contracts", async () => {
        await time.setTimeAndMine(now);
        await deployContracts(100, 100, now + 10, 100, 100);

        await wallet.stake(20);
        //expect(await staking.getStakedBalance(wallet.address)).to.eq(20);
       
        expect(await token.balanceOf(beneficiary.address)).to.eq(0);

        await time.setTime(now + 10 + 100 + 50);
        await wallet.release(30);
        expect(await token.balanceOf(beneficiary.address)).to.eq(30);

        expect(await wallet.getReleasable()).to.eq(0);
    });

  });


});
