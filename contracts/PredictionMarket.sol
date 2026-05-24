// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract PredictionMarket {
    IERC20 public constant USDC = IERC20(0x3600000000000000000000000000000000000000);

    enum Outcome {
        Unresolved,
        Yes,
        No
    }

    struct Market {
        address creator;
        string title;
        string description;
        string resolutionCriteria;
        uint256 deadline;
        uint256 aiProbability;
        string category;
        string triggeredByNews;
        uint256 totalYes;
        uint256 totalNo;
        uint256 liquidity;
        uint256 pool;
        Outcome outcome;
        bool resolved;
    }

    struct Position {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    uint256 public marketCount;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    mapping(uint256 => uint256) public creatorSeedYes;
    mapping(uint256 => uint256) public creatorSeedNo;

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string title,
        uint256 deadline,
        uint256 aiProbability,
        uint256 initialLiquidity
    );
    event BetPlaced(
        uint256 indexed marketId,
        address indexed user,
        bool indexed isYes,
        uint256 amount
    );
    event MarketResolved(uint256 indexed marketId, Outcome outcome);
    event PayoutClaimed(uint256 indexed marketId, address indexed user, uint256 payout);
    event PositionWithdrawn(uint256 indexed marketId, address indexed user, uint256 amount);
    event NoWinnerPoolWithdrawn(uint256 indexed marketId, address indexed creator, uint256 amount);

    error AmountZero();
    error InvalidMarket();
    error DeadlineInPast();
    error MarketClosed();
    error InvalidProbability();
    error MarketResolvedAlready();
    error MarketNotResolved();
    error NotMarketCreator();
    error MarketNotOpen();
    error AlreadyClaimed();
    error NoOpenPosition();
    error NoWinningPosition();
    error NoWinners();
    error TransferFailed();

    function createMarket(
        string calldata title,
        string calldata description,
        string calldata resolutionCriteria,
        uint256 deadline,
        uint256 initialLiquidity,
        uint256 aiProbability,
        string calldata category,
        string calldata triggeredByNews
    ) external returns (uint256 marketId) {
        if (initialLiquidity == 0) revert AmountZero();
        if (deadline <= block.timestamp) revert DeadlineInPast();
        if (aiProbability > 100) revert InvalidProbability();

        marketId = marketCount;
        marketCount += 1;
        uint256 yesSeed = initialLiquidity / 2;
        uint256 noSeed = initialLiquidity - yesSeed;

        markets[marketId] = Market({
            creator: msg.sender,
            title: title,
            description: description,
            resolutionCriteria: resolutionCriteria,
            deadline: deadline,
            aiProbability: aiProbability,
            category: category,
            triggeredByNews: triggeredByNews,
            totalYes: yesSeed,
            totalNo: noSeed,
            liquidity: initialLiquidity,
            pool: initialLiquidity,
            outcome: Outcome.Unresolved,
            resolved: false
        });

        creatorSeedYes[marketId] = yesSeed;
        creatorSeedNo[marketId] = noSeed;

        positions[marketId][msg.sender] = Position({
            yesAmount: yesSeed,
            noAmount: noSeed,
            claimed: false
        });

        _transferFrom(msg.sender, address(this), initialLiquidity);

        emit MarketCreated(marketId, msg.sender, title, deadline, aiProbability, initialLiquidity);
    }

    function betYes(uint256 marketId, uint256 amount) external {
        _placeBet(marketId, amount, true);
    }

    function betNo(uint256 marketId, uint256 amount) external {
        _placeBet(marketId, amount, false);
    }

    function resolveMarket(uint256 marketId, bool yesWon) external {
        Market storage market = _getMarket(marketId);
        if (market.resolved) revert MarketResolvedAlready();
        if (msg.sender != market.creator) revert NotMarketCreator();

        market.resolved = true;
        market.outcome = yesWon ? Outcome.Yes : Outcome.No;

        emit MarketResolved(marketId, market.outcome);
    }

    function claimPayout(uint256 marketId) external returns (uint256 payout) {
        Market storage market = _getMarket(marketId);
        if (!market.resolved) revert MarketNotResolved();

        Position storage position = positions[marketId][msg.sender];
        if (position.claimed) revert AlreadyClaimed();

        bool yesWon = market.outcome == Outcome.Yes;
        uint256 winningTotal = yesWon ? market.totalYes : market.totalNo;
        if (winningTotal == 0) revert NoWinners();

        uint256 winningAmount = yesWon ? position.yesAmount : position.noAmount;
        if (winningAmount == 0) revert NoWinningPosition();

        uint256 opposingSideBets = yesWon ? market.totalNo : market.totalYes;
        payout = winningAmount + ((winningAmount * opposingSideBets) / winningTotal);

        position.claimed = true;
        market.pool -= payout;
        _transfer(msg.sender, payout);

        emit PayoutClaimed(marketId, msg.sender, payout);
    }

    function withdrawPosition(uint256 marketId) external returns (uint256 amount) {
        Market storage market = _getMarket(marketId);
        if (market.resolved || market.deadline <= block.timestamp) revert MarketNotOpen();

        Position storage position = positions[marketId][msg.sender];

        uint256 lockedYesAmount = msg.sender == market.creator ? creatorSeedYes[marketId] : 0;
        uint256 lockedNoAmount = msg.sender == market.creator ? creatorSeedNo[marketId] : 0;
        uint256 yesAmount = position.yesAmount > lockedYesAmount ? position.yesAmount - lockedYesAmount : 0;
        uint256 noAmount = position.noAmount > lockedNoAmount ? position.noAmount - lockedNoAmount : 0;
        amount = yesAmount + noAmount;
        if (amount == 0) revert NoOpenPosition();

        if (yesAmount > 0) {
            position.yesAmount -= yesAmount;
            market.totalYes -= yesAmount;
        }

        if (noAmount > 0) {
            position.noAmount -= noAmount;
            market.totalNo -= noAmount;
        }

        market.pool -= amount;
        _transfer(msg.sender, amount);
        emit PositionWithdrawn(marketId, msg.sender, amount);
    }

    function withdrawNoWinnerPool(uint256 marketId) external returns (uint256 amount) {
        Market storage market = _getMarket(marketId);
        if (!market.resolved) revert MarketNotResolved();
        if (msg.sender != market.creator) revert NotMarketCreator();

        uint256 winningTotal = market.outcome == Outcome.Yes ? market.totalYes : market.totalNo;
        if (winningTotal != 0) revert NoWinners();

        amount = market.pool;
        market.pool = 0;
        _transfer(msg.sender, amount);

        emit NoWinnerPoolWithdrawn(marketId, msg.sender, amount);
    }

    function getPosition(uint256 marketId, address user)
        external
        view
        returns (uint256 yesAmount, uint256 noAmount, bool claimed)
    {
        Position storage position = positions[marketId][user];
        return (position.yesAmount, position.noAmount, position.claimed);
    }

    function quotePayout(uint256 marketId, address user) external view returns (uint256 payout) {
        Market storage market = _getMarket(marketId);
        if (!market.resolved) return 0;

        Position storage position = positions[marketId][user];
        if (position.claimed) return 0;

        bool yesWon = market.outcome == Outcome.Yes;
        uint256 winningTotal = yesWon ? market.totalYes : market.totalNo;
        if (winningTotal == 0) return 0;

        uint256 winningAmount = yesWon ? position.yesAmount : position.noAmount;
        if (winningAmount == 0) return 0;

        uint256 opposingSideBets = yesWon ? market.totalNo : market.totalYes;
        return winningAmount + ((winningAmount * opposingSideBets) / winningTotal);
    }

    function quoteBetPayout(uint256 marketId, bool isYes, uint256 amount) external view returns (uint256 payout) {
        Market storage market = _getMarket(marketId);
        if (amount == 0 || market.resolved) return 0;

        uint256 sideTotal = isYes ? market.totalYes : market.totalNo;
        uint256 sideTotalAfterBet = sideTotal + amount;
        uint256 opposingSideBets = isYes ? market.totalNo : market.totalYes;

        return amount + ((amount * opposingSideBets) / sideTotalAfterBet);
    }

    function _placeBet(uint256 marketId, uint256 amount, bool isYes) internal {
        if (amount == 0) revert AmountZero();

        Market storage market = _getMarket(marketId);
        if (market.resolved) revert MarketResolvedAlready();
        if (market.deadline <= block.timestamp) revert MarketClosed();

        Position storage position = positions[marketId][msg.sender];

        if (isYes) {
            position.yesAmount += amount;
            market.totalYes += amount;
        } else {
            position.noAmount += amount;
            market.totalNo += amount;
        }

        market.pool += amount;
        _transferFrom(msg.sender, address(this), amount);

        emit BetPlaced(marketId, msg.sender, isYes, amount);
    }

    function _getMarket(uint256 marketId) internal view returns (Market storage market) {
        if (marketId >= marketCount) revert InvalidMarket();
        return markets[marketId];
    }

    function _transferFrom(address from, address to, uint256 amount) internal {
        bool ok = USDC.transferFrom(from, to, amount);
        if (!ok) revert TransferFailed();
    }

    function _transfer(address to, uint256 amount) internal {
        bool ok = USDC.transfer(to, amount);
        if (!ok) revert TransferFailed();
    }
}
