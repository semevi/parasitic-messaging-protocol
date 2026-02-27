# 🌐 Parasitic Messaging Protocol (PMP 2.0)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-orange.svg)]()
[![Python 3.9+](https://img.shields.io/badge/Python-3.9+-blue.svg)]()
[![Blockchain](https://img.shields.io/badge/Blockchain-XRP%20%7C%20ETH%20%7C%20BTC-blue)]()
[![Tests](https://github.com/semevi/parasitic-messaging-protocol/actions/workflows/test.yml/badge.svg)]()

> **Decentralized, zero-cost, censorship-resistant messaging that leverages blockchain entropy for secure communication — no dedicated infrastructure required.**

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Why PMP 2.0?](#-why-pmp-20)
- [How It Works](#-how-it-works)
- [Quick Start](#-quick-start)
- [Usage Examples](#-usage-examples)
- [Features](#-features)
- [Architecture](#-architecture)
- [Documentation](#-documentation)
- [Security](#-security)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

---

## 🌟 Overview

**Parasitic Messaging Protocol (PMP 2.0)** is a novel decentralized communication layer that harvests cryptographic entropy from public blockchain transactions (XRP Ledger, Ethereum, Bitcoin) to enable secure, private messaging without:

- ❌ Gas fees for receivers
- ❌ Dedicated servers or nodes
- ❌ Central points of failure
- ❌ On-chain message storage

Built by an **Aviation Operations Supervisor** turned **Blockchain Architect**, PMP 2.0 applies **Linear Programming**, **Process Optimization**, and **IT Architecture** principles to solve real-world communication challenges.

---

## 💡 Why PMP 2.0?

| Traditional Messaging | Blockchain Messaging | **PMP 2.0** |
|----------------------|---------------------|-------------|
| Centralized servers | High gas fees | ✅ **Zero marginal cost** |
| Censorship vulnerable | Slow transaction times | ✅ **Instant delivery** |
| Metadata exposed | On-chain footprint | ✅ **Minimal footprint** |
| Infrastructure costs | Native token required | ✅ **No token needed** |

### Real-World Inspiration

> *"I optimized workforce scheduling for 200+ ramp agents at Aer Lingus using Linear Programming. Now I'm applying the same optimization thinking to decentralized communication."*

---

## 🔬 How It Works

### The Core Idea

Instead of creating new blockchain transactions for messaging, PMP 2.0 **harvests entropy** from transactions that are already happening for other reasons (payments, DeFi, NFTs, etc.).


---

┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│ Blockchain │────▶│ Entropy Layer │────▶│ Key Derivation │
│ (XRP/ETH/BTC) │ │ (Transaction Hash│ │ (HKDF-SHA256) │
│ ~1,500 TPS │ │ as Entropy) │ │ │
└─────────────────┘ └──────────────────┘ └─────────────────┘
│
▼
┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│ Public Relay │◀────│ Encrypted │◀────│ Message │
│ (IPFS/Twitter │ │ Message Payload │ │ Construction │
│ /GitHub) │ │ │ │ │
└─────────────────┘ └──────────────────┘ └─────────────────┘

---


### Dual-Mode Operation

| Mode | Description | On-Chain Footprint | Cost |
|------|-------------|-------------------|------|
| **Active** | Sender creates own TX for anchoring | Yes | Gas fee |
| **Passive** | Receiver monitors public TX only | No | **$0** |

### Cryptographic Stack

| Component | Algorithm | Security Level |
|-----------|-----------|----------------|
| Key Derivation | HKDF-SHA256 | 128-bit |
| Encryption | AES-256-GCM | 128-bit |
| Signatures | Ed25519 | 128-bit |
| Hashing | SHA-256 | 128-bit |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- Basic understanding of cryptography and blockchain

### Installation

```bash
# Clone the repository
git clone https://github.com/semevi/parasitic-messaging-protocol.git
cd parasitic-messaging-protocol

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install package (development mode)
pip install -e

--////////////--
RUN TESTS
--///////////__

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=src

# Run specific test module
pytest tests/test_crypto.py -v

--////////////--
RUN EXAMPLE
--///////////__

python examples/basic_messaging.py

💻 Usage Examples
Basic Messaging

from src.clients.python.pmp_client import PMPClient

# Initialize client
client = PMPClient(mode="passive", blockchain="xrpl")

# Get your identity
print(f"My identity: {client.get_identity()}")  # @e4f3a2b1

# Send message
result = client.send_message(
    recipient="@recipient_handle",
    content="Secret message",
    relay="ipfs"
)
print(f"Message sent: {result}")

# Receive messages
messages = client.receive_messages(limit=10)
for msg in messages:
    print(f"From {msg['sender']}: {msg['content']}")

Advanced: Custom Entropy Source

from src.core.protocol import PMPProtocol, MessageMode
from src.core.entropy import BlockchainSource, EntropyHarvester

# Initialize protocol with Ethereum entropy
protocol = PMPProtocol(
    mode=MessageMode.ACTIVE,
    blockchain=BlockchainSource.ETHEREUM
)

# Create and send message
message = protocol.create_message(
    recipient="@user",
    content="Encrypted content",
    relay=RelayType.IPFS
)

# Get protocol statistics
stats = protocol.get_stats()
print(f"Messages sent: {stats['messages_sent']}")

Export Keys (Backup)

# IMPORTANT: Store this securely!
keys = client.export_keys()
print(f"Identity: {keys['identity']}")
print(f"Public Key: {keys['public_key']}")
print(f"⚠️ {keys['warning']}")

✨ Features
Implemented ✅
Entropy harvesting from XRP Ledger
Key derivation (HKDF-SHA256)
Message encryption (AES-256-GCM)
Digital signatures (Ed25519)
IPFS relay integration
Human-readable identity system (@handle)
Passive mode operation (zero-cost receiving)
Python client library
Comprehensive test suite
CI/CD pipeline (GitHub Actions)
In Progress 🚧
Ethereum entropy source
Bitcoin entropy source
Twitter API relay
GitHub Gists relay
JavaScript/TypeScript client
Mobile client (React Native)
Web client (PWA)
Security audit
Planned 📋
Group messaging
File attachments (IPFS)
Voice/video calls (WebRTC + PMP key exchange)
Zero-knowledge metadata proofs
Decentralized identity (DID) integration
Governance mechanism


🏛 Architecture
Component Overview

┌──────────────────────────────────────────────────────────────────────┐
│                           Client Application                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Identity  │  │   Message   │  │    Relay    │  │    Crypto   │ │
│  │   Manager   │  │   Builder   │  │   Manager   │  │   Manager   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                           Entropy Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   XRPL      │  │  Ethereum   │  │   Bitcoin   │                  │
│  │   Harvester │  │  Harvester  │  │  Harvester │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                           Relay Network                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    IPFS     │  │   Twitter   │  │   GitHub    │  │   Arweave   │ │
│  │   (Primary) │  │  (Fallback) │  │  (Fallback) │  │  (Archive)  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

⚠️ Important Warnings

This is experimental software — Do not use for sensitive communications until after formal security audit
No key recovery — If you lose your seed, you lose access permanently
Not audited — Vulnerabilities may exist; use at your own risk
Report vulnerabilities — See SECURITY.md for responsible disclosure

🤝 Contributing
We welcome contributions! PMP 2.0 is built on the belief that communication should be free, private, and resilient.
Ways to Contribute
🐛 Report bugs — Open an issue with reproduction steps
💡 Suggest features — Discuss in GitHub Discussions
📝 Improve documentation — Fix typos, add examples
🔧 Submit PRs — Follow CONTRIBUTING.md
🧪 Test the protocol — Try it out and share feedback
🔒 Security research — Report vulnerabilities responsibly

# Fork and clone
git clone https://github.com/semevi/parasitic-messaging-protocol.git
cd parasitic-messaging-protocol

# Create branch
git checkout -b feature/your-feature-name

# Install dev dependencies
pip install -e ".[dev]"

# Make changes, write tests
# Run tests
pytest tests/ -v

# Commit (use Conventional Commits)
git commit -m "feat: add amazing feature"

# Push and open PR
git push origin feature/your-feature-name


Code Style
Python: PEP 8, formatted with black
Type hints: Required for all public functions
Commits: Conventional Commits
Tests: All PRs must include tests

📜 License
This project is licensed under the MIT License — see the LICENSE file for details.
You can:
✅ Use commercially
✅ Modify and distribute
✅ Use in private projects
✅ Use in open-source projects
You must:
✅ Include license and copyright notice


