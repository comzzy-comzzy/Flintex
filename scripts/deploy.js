/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs')
const path = require('node:path')
const solc = require('solc')
const { ethers } = require('ethers')

const contractPath = path.join(__dirname, '..', 'contracts', 'PredictionMarket.sol')
const source = fs.readFileSync(contractPath, 'utf8')

const input = {
  language: 'Solidity',
  sources: {
    'PredictionMarket.sol': {
      content: source,
    },
  },
  settings: {
    viaIR: true,
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object'],
      },
    },
  },
}

const output = JSON.parse(solc.compile(JSON.stringify(input)))

if (output.errors) {
  const errors = output.errors.filter((item) => item.severity === 'error')
  for (const item of output.errors) {
    const stream = item.severity === 'error' ? process.stderr : process.stdout
    stream.write(`${item.formattedMessage}\n`)
  }

  if (errors.length > 0) {
    throw new Error('Solidity compilation failed')
  }
}

const compiled = output.contracts['PredictionMarket.sol'].PredictionMarket
const abi = compiled.abi
const bytecode = `0x${compiled.evm.bytecode.object}`
const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'PredictionMarket.sol', 'PredictionMarket.json')

const writeArtifact = () => {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true })
  fs.writeFileSync(artifactPath, `${JSON.stringify({
    _format: 'hh-sol-artifact-1',
    contractName: 'PredictionMarket',
    sourceName: 'contracts/PredictionMarket.sol',
    abi,
    bytecode,
    deployedBytecode: '0x',
    linkReferences: {},
    deployedLinkReferences: {},
  }, null, 2)}\n`)
}

async function main() {
  writeArtifact()

  if (process.argv.includes('--compile-only')) {
    console.log(`PredictionMarket compiled. ABI entries: ${abi.length}`)
    return
  }

  const { RPC_URL, DEPLOYER_PRIVATE_KEY, AI_RESOLVER_ADDRESS } = process.env

  if (!RPC_URL) {
    throw new Error('Missing RPC_URL environment variable')
  }

  if (!DEPLOYER_PRIVATE_KEY) {
    throw new Error('Missing DEPLOYER_PRIVATE_KEY environment variable')
  }

  if (!AI_RESOLVER_ADDRESS) {
    throw new Error('Missing AI_RESOLVER_ADDRESS environment variable')
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider)
  const factory = new ethers.ContractFactory(abi, bytecode, wallet)

  console.log(`Deploying PredictionMarket from ${wallet.address}`)
  console.log(`AI resolver: ${AI_RESOLVER_ADDRESS}`)
  const contract = await factory.deploy(AI_RESOLVER_ADDRESS)
  await contract.waitForDeployment()

  const address = await contract.getAddress()
  console.log(`PredictionMarket deployed to ${address}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
