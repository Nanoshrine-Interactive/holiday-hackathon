// Save this as getPrivateKey.js
import { mnemonicToSeedSync } from '@scure/bip39'
import { HDKey } from '@scure/bip32'

const args = process.argv

if (args.length < 3) {
  console.error('Please provide your seed phrase as a command-line argument')
  console.error(
    'Usage: node getPrivateKey.js "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"'
  )
  process.exit(1)
}

const seedPhrase = args[2]

try {
  // Validate seed phrase format
  if (seedPhrase.split(' ').length !== 12) {
    throw new Error('Seed phrase must contain exactly 12 words')
  }

  // Convert mnemonic to seed
  const seed = mnemonicToSeedSync(seedPhrase)

  // Create HD wallet
  const hdKey = HDKey.fromMasterSeed(seed)

  // Derive the private key (using standard Ethereum derivation path)
  const path = "m/44'/60'/0'/0/0"
  const derived = hdKey.derive(path)

  // Get private key and ensure it has 0x prefix
  const privateKey = '0x' + Buffer.from(derived.privateKey).toString('hex')

  console.log('\nYour private key (for .env file):')
  console.log(`WALLET_PRIVATE_KEY=${privateKey}\n`)
} catch (error) {
  console.error('\nError:', error.message)
  process.exit(1)
}
