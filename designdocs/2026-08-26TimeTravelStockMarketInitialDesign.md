# Time Travel Stock Market
Time Travel Stock Market is a daily browser game that asks users to guess how much
they should invest if they had an opportunity to do so on a given day in history.

The game should use a random seed which is typically derived from the current date
in the pacific time zone. Appending ?seed=x to the url should be possible for testing.

On each seed, we should:
- Pick a valid date within the history available to us for stock data in the NYSE
- Pick N sets of 2 stocks (let's start with 3 sets)
	- Optionally, we should focus on stocks that have high earnings from the selected random date today
	- Optionally, these stocks should be similar to each other in some way, i.e. we pick Nintendo and Sony, though we can defer on that

Play proceeds by showing users a selected set of 2 stocks, and asking them to move
a slider that starts in the middle between the two stocks - it starts with
investing 5000 dollars into each stock, but the slider can make it 10k invested in
either one, or any percentage inbetween.

After the user has set the slider, they hit submit, and we tell them how much each
stock price has changed since that date and how much money they "made" via their choice.

At the end of showing the 3 sets of stocks and users submitting their scores, we
tell them how much they made, how much they could have made with optimal choices,
and for comparison, we show how much the S&P 500 made over the same time period
from the same amount of capitol.

Users should then have a share button to tweet how much money they made and link
the game.

# Data
We should find an open source of stock data, and then either query it at runtime or
cache it offline ahead of time. This decision needs some exploration of the available
data.
