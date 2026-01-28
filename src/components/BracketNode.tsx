import React from 'react';
import type { Match, Participant } from '../types';

// Scalable sizing using CSS variables - base unit approach
export const MATCH_HEIGHT = 88; // Compact but readable
export const MATCH_WIDTH = 180; // Narrower for mobile
export const MATCH_GAP = 20; // Gap between matches (increased for better visibility)
export const CONNECTOR_WIDTH = 48; // Connector line width (increased for cleaner lines)

export interface BracketNodeProps {
    matchId: string;
    matchMap: Map<string, Match>;
    depth?: number;
    scale?: number; // Optional scale factor for responsiveness
}

// Calculate the height a subtree needs - returns the total height including all descendants
export const getSubtreeHeight = (matchId: string | undefined, matchMap: Map<string, Match>, scale: number = 1): number => {
    const scaledHeight = MATCH_HEIGHT * scale;
    const scaledGap = MATCH_GAP * scale;
    
    if (!matchId) return scaledHeight;
    const match = matchMap.get(matchId);
    if (!match) return scaledHeight;

    const leftChildId = match.leftChildId;
    const rightChildId = match.rightChildId;

    // Leaf node - just the match card height
    if (!leftChildId && !rightChildId) {
        return scaledHeight;
    }

    // Node with children - sum of children heights + gap between them
    const leftHeight = getSubtreeHeight(leftChildId, matchMap, scale);
    const rightHeight = getSubtreeHeight(rightChildId, matchMap, scale);

    return leftHeight + rightHeight + scaledGap;
};

// Get the Y offset where the match card's center is located within its subtree
const getMatchCenterOffset = (matchId: string | undefined, matchMap: Map<string, Match>, scale: number = 1): number => {
    const scaledHeight = MATCH_HEIGHT * scale;
    const scaledGap = MATCH_GAP * scale;
    
    if (!matchId) return scaledHeight / 2;
    const match = matchMap.get(matchId);
    if (!match) return scaledHeight / 2;

    const leftChildId = match.leftChildId;
    const rightChildId = match.rightChildId;

    // Leaf node - center is at half the match height
    if (!leftChildId && !rightChildId) {
        return scaledHeight / 2;
    }

    // Node with children - center is at the middle of total subtree height
    const leftHeight = getSubtreeHeight(leftChildId, matchMap, scale);
    const rightHeight = getSubtreeHeight(rightChildId, matchMap, scale);
    const totalHeight = leftHeight + rightHeight + scaledGap;

    return totalHeight / 2;
};

export const BracketNode: React.FC<BracketNodeProps> = ({ matchId, matchMap, depth = 0, scale = 1 }) => {
    const match = matchMap.get(matchId);
    if (!match) return null;

    const leftChildId = match.leftChildId;
    const rightChildId = match.rightChildId;
    const hasChildren = !!(leftChildId && rightChildId);
    const isFinal = match.round === 'Final';

    // Scaled dimensions
    const scaledHeight = MATCH_HEIGHT * scale;
    const scaledWidth = MATCH_WIDTH * scale;
    const scaledGap = MATCH_GAP * scale;
    const scaledConnector = CONNECTOR_WIDTH * scale;
    const lineWidth = Math.max(2, 2.5 * scale);

    const renderPlayer = (p: Participant | 'BYE' | null | undefined, isWinner: boolean, side: 'red' | 'blue') => {
        let name = 'TBD';
        let club = '';
        const isBye = p === 'BYE';

        if (typeof p === 'string') {
            name = p;
        } else if (p) {
            name = p.name;
            club = p.club;
        }

        const sideColors = side === 'red' 
            ? { bar: 'bg-red-500', winBg: 'bg-gradient-to-r from-red-50 to-transparent' }
            : { bar: 'bg-blue-500', winBg: 'bg-gradient-to-r from-blue-50 to-transparent' };

        return (
            <div 
                className={`bracket-player px-2 py-1.5 flex items-center gap-2 transition-all ${isWinner ? sideColors.winBg : ''} ${isBye ? 'opacity-40' : ''}`}
                style={{ minHeight: `${scaledHeight * 0.38}px` }}
            >
                <div className={`w-1 ${sideColors.bar} rounded-full shrink-0 self-stretch`}></div>
                <div className="flex-1 min-w-0">
                    <div 
                        className={`font-semibold truncate ${isWinner ? 'text-gray-900' : 'text-gray-700'}`}
                        style={{ fontSize: `${Math.max(11, 12 * scale)}px` }}
                        title={name}
                    >
                        {name}
                        {isWinner && <span className="ml-1 text-emerald-500">✓</span>}
                    </div>
                    {club && (
                        <div 
                            className="text-gray-400 truncate" 
                            style={{ fontSize: `${Math.max(9, 10 * scale)}px` }}
                        >
                            {club}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Calculate precise connector positions
    const leftSubtreeHeight = hasChildren ? getSubtreeHeight(leftChildId, matchMap, scale) : 0;
    const rightSubtreeHeight = hasChildren ? getSubtreeHeight(rightChildId, matchMap, scale) : 0;
    const totalChildHeight = leftSubtreeHeight + rightSubtreeHeight + scaledGap;

    // Get the center Y position of each child's match card within its subtree
    const leftMatchCenter = hasChildren ? getMatchCenterOffset(leftChildId, matchMap, scale) : 0;
    const rightMatchCenter = hasChildren ? getMatchCenterOffset(rightChildId, matchMap, scale) : 0;

    // Calculate absolute Y positions in the SVG coordinate system
    const topConnectorY = leftMatchCenter; // Where top child's match card center is
    const bottomConnectorY = leftSubtreeHeight + scaledGap + rightMatchCenter; // Where bottom child's match card center is
    const parentConnectorY = totalChildHeight / 2; // Where this match card's center will be (due to items-center)

    // X positions for the connector lines
    const junctionX = scaledConnector * 0.5; // Vertical line position

    return (
        <div className="bracket-node flex items-center" style={{ position: 'relative' }}>
            {hasChildren && (
                <>
                    {/* Child matches container */}
                    <div 
                        className="flex flex-col shrink-0" 
                        style={{ gap: `${scaledGap}px` }}
                    >
                        <BracketNode matchId={leftChildId!} matchMap={matchMap} depth={depth + 1} scale={scale} />
                        <BracketNode matchId={rightChildId!} matchMap={matchMap} depth={depth + 1} scale={scale} />
                    </div>

                    {/* SVG Connector Lines */}
                    <svg
                        className="connector-lines shrink-0"
                        width={scaledConnector}
                        height={totalChildHeight}
                        style={{ 
                            display: 'block',
                            overflow: 'visible'
                        }}
                    >
                        {/* Horizontal line from top child match card to junction */}
                        <line
                            x1={0}
                            y1={topConnectorY}
                            x2={junctionX}
                            y2={topConnectorY}
                            stroke="#475569"
                            strokeWidth={lineWidth}
                            strokeLinecap="square"
                        />
                        
                        {/* Horizontal line from bottom child match card to junction */}
                        <line
                            x1={0}
                            y1={bottomConnectorY}
                            x2={junctionX}
                            y2={bottomConnectorY}
                            stroke="#475569"
                            strokeWidth={lineWidth}
                            strokeLinecap="square"
                        />
                        
                        {/* Vertical line connecting top and bottom */}
                        <line
                            x1={junctionX}
                            y1={topConnectorY}
                            x2={junctionX}
                            y2={bottomConnectorY}
                            stroke="#475569"
                            strokeWidth={lineWidth}
                            strokeLinecap="square"
                        />
                        
                        {/* Horizontal line from junction to parent match card */}
                        <line
                            x1={junctionX}
                            y1={parentConnectorY}
                            x2={scaledConnector}
                            y2={parentConnectorY}
                            stroke="#475569"
                            strokeWidth={lineWidth}
                            strokeLinecap="square"
                        />
                    </svg>
                </>
            )}

            {/* Match Card */}
            <div
                className={`bracket-match bg-white border rounded-lg shadow-sm flex flex-col justify-center relative shrink-0 z-10 transition-all duration-200 hover:shadow-md hover:border-blue-200 overflow-hidden
                    ${isFinal ? 'border-amber-300 ring-2 ring-amber-100 shadow-amber-100/50' : 'border-gray-200'}
                    ${match.winner ? 'border-emerald-200' : ''}`}
                style={{ 
                    width: `${scaledWidth}px`, 
                    height: `${scaledHeight}px`,
                    minWidth: `${Math.max(140, scaledWidth)}px`
                }}
            >
                {/* Bout Number Badge */}
                {match.bout_number && (
                    <div 
                        className={`absolute top-0 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-b-md font-bold shadow-sm z-20
                            ${isFinal 
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white' 
                                : 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'}`}
                        style={{ fontSize: `${Math.max(8, 9 * scale)}px` }}
                    >
                        {match.bout_number}
                    </div>
                )}
                
                {/* Round Label */}
                <div 
                    className={`absolute top-1 right-1.5 font-semibold uppercase tracking-wider
                        ${isFinal ? 'text-amber-500' : 'text-gray-400'}`}
                    style={{ fontSize: `${Math.max(7, 8 * scale)}px` }}
                >
                    {match.round}
                </div>

                {/* Players Container */}
                <div className="flex flex-col w-full mt-3">
                    {renderPlayer(match.red, match.winner === match.red && match.red !== null, 'red')}
                    <div className="border-t border-gray-100 mx-1.5"></div>
                    {renderPlayer(match.blue, match.winner === match.blue && match.blue !== null, 'blue')}
                </div>

                {/* Winner glow for finals */}
                {isFinal && match.winner && (
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-100/40 to-transparent pointer-events-none"></div>
                )}
            </div>
        </div>
    );
};
