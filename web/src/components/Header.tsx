/**
 * Header Component
 * 
 * App header with logo and wallet connection button.
 */

"use client";

import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
    return (
        <header className="app-header">
            <div className="header-content">
                <div className="logo-section">
                    <h1 className="app-title">
                        <span className="logo-icon">☀️</span>
                        Morning Desk
                    </h1>
                    <span className="app-tagline">Your Pocket Analyst</span>
                </div>

                <div className="wallet-section">
                    <ConnectButton.Custom>
                        {({
                            account,
                            chain,
                            openAccountModal,
                            openChainModal,
                            openConnectModal,
                            mounted,
                        }) => {
                            const ready = mounted;
                            const connected = ready && account && chain;

                            return (
                                <div
                                    {...(!ready && {
                                        "aria-hidden": true,
                                        style: {
                                            opacity: 0,
                                            pointerEvents: "none",
                                            userSelect: "none",
                                        },
                                    })}
                                >
                                    {(() => {
                                        if (!connected) {
                                            return (
                                                <div className="wallet-connect-wrapper">
                                                    <button
                                                        onClick={openConnectModal}
                                                        type="button"
                                                        className="wallet-connect-btn"
                                                    >
                                                        Connect Base Wallet
                                                    </button>
                                                    <span className="wallet-helper-text">
                                                        Supports Coinbase Wallet, MetaMask, and WalletConnect via RainbowKit.
                                                    </span>
                                                </div>
                                            );
                                        }

                                        if (chain.unsupported) {
                                            return (
                                                <button
                                                    onClick={openChainModal}
                                                    type="button"
                                                    className="wallet-wrong-network-btn"
                                                >
                                                    Wrong network
                                                </button>
                                            );
                                        }

                                        return (
                                            <div className="wallet-connected">
                                                <button
                                                    onClick={openChainModal}
                                                    type="button"
                                                    className="wallet-chain-btn"
                                                >
                                                    {chain.hasIcon && (
                                                        <div
                                                            className="wallet-chain-icon"
                                                            style={{
                                                                background: chain.iconBackground,
                                                            }}
                                                        >
                                                            {chain.iconUrl && (
                                                                <img
                                                                    alt={chain.name ?? "Chain icon"}
                                                                    src={chain.iconUrl}
                                                                    style={{ width: 16, height: 16 }}
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </button>

                                                <button
                                                    onClick={openAccountModal}
                                                    type="button"
                                                    className="wallet-account-btn"
                                                >
                                                    {account.displayName}
                                                    {account.displayBalance
                                                        ? ` (${account.displayBalance})`
                                                        : ""}
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            );
                        }}
                    </ConnectButton.Custom>
                </div>
            </div>
        </header>
    );
}

export default Header;
