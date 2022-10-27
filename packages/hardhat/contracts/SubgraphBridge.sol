pragma solidity ^0.8.0;
// SPDX-License-Identifier: MIT

import "hardhat/console.sol";
import "./GraphContractInterfaces/IController.sol";
import "./GraphContractInterfaces/IStaking.sol";
import "./GraphContractInterfaces/IDisputeManager.sol";
import "./SubgraphBridgeHelpers.sol";

//@title SubgraphBridge
//@notice SubgraphBridge is a contract that allows us to bridge subgraph data from The Graph's Decentralized Network to Ethereum in a cryptoeconomically secure manner.
contract SubgraphBridge is SubgraphBridgeHelpers {
    address public theGraphStaking;
    address public theGraphDisputeManager;

    // {block hash} -> {block number}
    mapping(bytes32 => uint256) public pinnedBlocks;

    // {QueryBridgeID} -> {QueryBridge}
    mapping(bytes32 => QueryBridge) public queryBridges;

    // {QueryBridgeID} -> {attestation.requestCID} -> {QueryBridgeProposals}
    mapping(bytes32 => mapping(bytes32 => QueryBridgeProposals))
        public queryBridgeProposals;

    // not yet implemented
    // {QueryBridgeID} -> {attestation.requestCID} -> {block number}
    mapping(bytes32 => mapping(bytes32 => uint256))
        public bridgeConflictResolutionBlock;

    // {QueryBridgeID} -> {requestCID} -> {responseData}
    mapping(bytes32 => mapping(bytes32 => uint256)) public dataStreams;

    constructor(address staking, address disputeManager) {
        theGraphStaking = staking;
        theGraphDisputeManager = disputeManager;
    }

    // ============================================================
    // PUBLIC FUNCTIONS TO BE USED BY THE MASSES
    // ============================================================

    //@notice creates a query bridge
    //@dummy create a way to get subgraph query results back on chain
    function createQueryBridge(QueryBridge memory queryBridge) public {
        bytes32 queryBridgeID = _queryBridgeID(queryBridge);
        queryBridges[queryBridgeID] = queryBridge;
        console.log("created query bridge with id: ");
        console.logBytes32(queryBridgeID);
    }

    // @notice, this function is used to provide an attestation for a query
    // @dummy, whoever calls this is providing the data for ur query
    function submitQueryBridgeProposal(
        uint256 blockNumber,
        string calldata query,
        string calldata response,
        bytes32 queryBridgeID,
        bytes calldata attestationData
    ) public {
        bytes32 pinnedBlockHash = blockhash(blockNumber);
        if (pinnedBlocks[pinnedBlockHash] == 0) {
            pinnedBlocks[pinnedBlockHash] = blockNumber;
        }
        require(
            queryBridges[queryBridgeID].blockHashOffset > 0,
            "query bridge doesn't exist"
        );
        require(
            _queryMatchesBridge(query, queryBridgeID),
            "query doesn't fit template"
        );

        IDisputeManager.Attestation memory attestation = _parseAttestation(
            attestationData
        );
        require(
            _queryAndResponseMatchAttestation(response, attestation),
            "query/response != attestation"
        );

        // get indexer's slashable stake from staking contract
        address attestationIndexer = IDisputeManager(theGraphDisputeManager)
            .getAttestationIndexer(attestation);
        uint256 indexerStake = IStaking(theGraphStaking).getIndexerStakedTokens(
            attestationIndexer
        );
        require(indexerStake > 0, "indexer doesn't have slashable stake");

        QueryBridgeProposals storage proposals = queryBridgeProposals[
            queryBridgeID
        ][attestation.requestCID];

        if (
            proposals
                .stake[attestation.responseCID]
                .totalStake
                .attestationStake == 0
        ) {
            console.log("proposal count++");
            proposals.proposalCount = proposals.proposalCount + 1;

            uint16 blockHashOffset = queryBridges[queryBridgeID]
                .blockHashOffset;
            bytes32 queryBlockHash = _bytes32FromStringWithOffset(
                query,
                blockHashOffset + 2
            ); // todo: why +2?
            require(pinnedBlocks[queryBlockHash] > 0, "block hash unpinned");
        }

        // update stake values
        proposals
            .stake[attestation.responseCID]
            .accountStake[attestationIndexer]
            .attestationStake = indexerStake;
        proposals.stake[attestation.responseCID].totalStake.attestationStake =
            proposals
                .stake[attestation.responseCID]
                .totalStake
                .attestationStake +
            indexerStake;
        proposals.totalStake.attestationStake =
            proposals.totalStake.attestationStake +
            indexerStake;
    }

    //@notice, this function allows you to use a non disputed query response after the dispute period has ended
    //@dummy, use this function to slurp up your query data
    function executeProposal(
        string calldata query,
        bytes32 requestCID, // todo: remove once we solve (query -> requestCID) mystery
        string calldata response,
        bytes32 queryBridgeID
    ) public {
        uint16 blockHashOffset = queryBridges[queryBridgeID].blockHashOffset +
            2;
        bytes32 queryBlockHash = _bytes32FromStringWithOffset(
            query,
            blockHashOffset
        ); // todo: why +2?
        // bytes32 queryTemplateHash = queryBridges[queryBridgeID].queryTemplate;
        // bytes32 subgraphDeploymentID = queryBridges[queryBridgeID].subgraphDeploymentID;
        // uint16 responseDataOffset = queryBridges[queryBridgeID].responseDataOffset;
        uint8 proposalFreezePeriod = queryBridges[queryBridgeID]
            .proposalFreezePeriod;
        uint8 minimumSlashableGRT = queryBridges[queryBridgeID]
            .minimumSlashableGRT;

        console.logBytes32(queryBlockHash);
        require(
            pinnedBlocks[queryBlockHash] + proposalFreezePeriod <= block.number,
            "proposal still frozen"
        );
        require(
            _queryMatchesBridge(query, queryBridgeID),
            "query doesn't fit template"
        );

        QueryBridgeProposals storage proposals = queryBridgeProposals[
            queryBridgeID
        ][requestCID];
        require(proposals.proposalCount == 1, "proposalCount must be 1");
        bytes32 responseCID = keccak256(abi.encodePacked(response));

        require(
            proposals.stake[responseCID].totalStake.attestationStake >
                minimumSlashableGRT,
            "not enough stake"
        );

        _extractData(queryBridgeID, requestCID, response);
    }

    // ============================================================
    // INTERNAL AND HELPER FUNCTIONS
    // ============================================================
    function pinBlockHash(uint256 blockNumber) public {
        pinnedBlocks[blockhash(blockNumber)] = blockNumber;
    }

    function _queryMatchesBridge(string calldata query, bytes32 queryBridgeID)
        public
        view
        returns (bool)
    {
        QueryBridge memory bridge = queryBridges[queryBridgeID];
        return (_generateQueryTemplateHash(
            query,
            bridge.blockHashOffset,
            bridge.queryVariables
        ) == bridge.queryTemplate);
    }

    function _extractData(
        bytes32 queryBridgeID,
        bytes32 requestCID,
        string calldata response
    ) private {
        uint256 responseT = uint256(
            queryBridges[queryBridgeID].responseDataType
        );
        console.log(responseT);
        if (
            queryBridges[queryBridgeID].responseDataType == BridgeDataType.UINT
        ) {
            console.log("it's a uint response");
            dataStreams[queryBridgeID][requestCID] = _uintFromString(
                response,
                queryBridges[queryBridgeID].responseDataOffset
            );
            string memory s = response[queryBridges[queryBridgeID]
                .responseDataOffset:];
            console.log(s);
        }
    }

    function _queryAndResponseMatchAttestation(
        // string calldata query,
        string calldata response,
        IDisputeManager.Attestation memory attestation
    ) internal pure returns (bool) {
        // todo: figure out why keccak256(query) doesn't match attestation.requestCID
        // require(attestation.requestCID == keccak256(abi.encodePacked(query)), "query does not match attestation requestCID");
        return (attestation.responseCID ==
            keccak256(abi.encodePacked(response)));
    }

    /**
     * @dev Parse the bytes attestation into a struct from `_data`.
     * @return Attestation struct
     */
    function _parseAttestation(bytes memory _data)
        internal
        pure
        returns (IDisputeManager.Attestation memory)
    {
        // Check attestation data length
        require(
            _data.length == ATTESTATION_SIZE_BYTES,
            "Attestation must be 161 bytes long"
        );

        // Decode receipt
        (
            bytes32 requestCID,
            bytes32 responseCID,
            bytes32 subgraphDeploymentID
        ) = abi.decode(_data, (bytes32, bytes32, bytes32));

        // Decode signature
        // Signature is expected to be in the order defined in the Attestation struct
        bytes32 r = _toBytes32(_data, SIG_R_OFFSET);
        bytes32 s = _toBytes32(_data, SIG_S_OFFSET);
        uint8 v = _toUint8(_data, SIG_V_OFFSET);

        return
            IDisputeManager.Attestation(
                requestCID,
                responseCID,
                subgraphDeploymentID,
                r,
                s,
                v
            );
    }

    function _generateQueryTemplateHash(
        string calldata query,
        uint256 blockHashOffset,
        uint16[2] memory queryVariables
    ) internal view returns (bytes32) {
        uint8 qv0Idx = uint8(queryVariables[0] >> 8);
        uint8 qv0Length = _lengthForQueryVariable(
            qv0Idx,
            BridgeDataType(uint8(queryVariables[0])),
            query
        );
        uint8 qv1Idx = uint8(queryVariables[1] >> 8) + qv0Idx + qv0Length;
        uint8 qv1Length = _lengthForQueryVariable(
            qv1Idx,
            BridgeDataType(uint8(queryVariables[1])),
            query
        );

        bytes memory strippedQTemplate = bytes.concat(
            bytes(query)[:blockHashOffset],
            bytes(query)[blockHashOffset + 66:qv0Idx]
        );

        if (qv1Idx == 0) {
            strippedQTemplate = bytes.concat(
                strippedQTemplate,
                bytes(query)[qv0Idx + qv0Length:]
            );
        } else {
            strippedQTemplate = bytes.concat(
                strippedQTemplate,
                bytes(query)[qv0Idx + qv0Length:qv1Idx],
                bytes(query)[qv1Idx + qv1Length:]
            );
        }

        return keccak256(abi.encode(strippedQTemplate));
    }
}
