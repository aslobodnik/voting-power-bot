import { Bot } from "grammy";

// Function to resolve ENS name and twitter handle for an address
async function getENSInfo(
  address: string
): Promise<{ name: string; twitter?: string }> {
  try {
    const response = await fetch(
      `https://ens-api.slobo.xyz/address/${address}`
    );
    const data = await response.json();
    return {
      name: data.name || address,
      twitter: data.texts?.["com.twitter"],
    };
  } catch (error) {
    return { name: address };
  }
}

// Function to format address (truncate if no ENS name)
function formatAddress(address: string, hasENSName: boolean): string {
  if (hasENSName) {
    return address;
  }
  return `${address.slice(0, 6)}..${address.slice(-4)}`;
}

// Function to get and format recent activity
async function getRecentActivity(ctx: any) {
  // Send initial "Fetching data..." message
  const loadingMessage = await ctx.reply("Fetching data...");

  try {
    const threshold = "1000000000000000000000"; // 1000 ENS with 18 decimals
    const res = await fetch(
      `https://votingpower.xyz/api/get-recent-activity?threshold=${threshold}`
    );
    console.log("fetched data");
    const data = await res.json();
    const items = data.data.slice(0, 20); // show 20 most recent

    // Resolve ENS names and twitter handles for all delegates and delegators
    const itemsWithInfo = await Promise.all(
      items.map(async (item: any) => ({
        ...item,
        delegateInfo: await getENSInfo(item.delegate_address),
        delegatorInfo: item.delegator ? await getENSInfo(item.delegator) : null,
      }))
    );

    // Group messages by month
    const groupedByMonth = itemsWithInfo.reduce((groups: any, item: any) => {
      const date = new Date(Number(item.block_timestamp) * 1000);
      const monthYear = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(item);
      return groups;
    }, {});

    // Create messages grouped by month with netted changes
    const messages = Object.entries(groupedByMonth)
      .map(([monthYear, items]: [string, any]) => {
        // Group by delegate and calculate net changes
        const delegateGroups = items.reduce((acc: any, item: any) => {
          const delegateKey = item.delegate_address;
          if (!acc[delegateKey]) {
            acc[delegateKey] = {
              delegate_address: item.delegate_address,
              delegateInfo: item.delegateInfo,
              totalChange: 0,
              finalPower: item.voting_power, // Set from the newest transaction
              items: [],
            };
          }
          acc[delegateKey].totalChange += Number(item.voting_power_change);
          // The line below was incorrect and has been removed.
          acc[delegateKey].items.push(item);
          return acc;
        }, {});

        // Filter out delegates with net changes less than 1000 ENS
        const significantDelegates = Object.values(delegateGroups).filter(
          (delegate: any) => {
            const netChangeInENS = Math.abs(delegate.totalChange) / 1e18;
            return netChangeInENS >= 1000;
          }
        );

        if (significantDelegates.length === 0) {
          return null; // Skip this month if no significant changes
        }

        const dateHeader = `======== ${monthYear} =======`;
        const itemMessages = significantDelegates.map((delegate: any) => {
          const changeInENS = Math.round(
            Math.abs(delegate.totalChange) / 1e18
          ).toLocaleString();
          const totalPower = Math.round(
            Number(delegate.finalPower) / 1e18
          ).toLocaleString();
          const isGain = delegate.totalChange > 0;
          const action = isGain ? "+" : "-";
          const hasENSName =
            delegate.delegateInfo.name !== delegate.delegate_address;
          const displayName = hasENSName
            ? delegate.delegateInfo.name
            : formatAddress(delegate.delegate_address, false);

          // Build social media section (twitter only)
          const socialLinks = [];
          if (delegate.delegateInfo.twitter) {
            socialLinks.push(
              `<a href="https://x.com/${delegate.delegateInfo.twitter}">X</a>`
            );
          }
          const socialSection =
            socialLinks.length > 0 ? ` | ${socialLinks.join(" | ")}` : "";

          return `<a href="https://etherscan.io/address/${delegate.delegate_address}">${displayName}</a>${socialSection}\n${action}${changeInENS} ENS → ${totalPower} total`;
        });

        return {
          text: `${dateHeader}\n\n${itemMessages.join("\n\n")}`,
        };
      })
      .filter(Boolean); // Remove null months

    // Delete the loading message before sending results
    await ctx.api.deleteMessage(ctx.chat.id, loadingMessage.message_id);

    for (const message of messages) {
      if (!message?.text) continue;

      await ctx.reply(message.text, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    }
  } catch (err) {
    ctx.reply("Error fetching data.");
  }
}

// Create and configure bot
export function createBot(token: string) {
  const bot = new Bot(token);

  bot.command("start", (ctx) => {
    console.log("✅ Handler triggered: /start");
    return ctx.reply(
      `Welcome to Voting Power Bot!\n\n🔗 <a href="https://votingpower.xyz">votingpower.xyz</a>`,
      {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📊 Recent Activity",
                callback_data: "recent",
              },
            ],
          ],
        },
      }
    );
  });

  bot.command("test", (ctx) => {
    console.log("✅ Handler triggered: /test");
    return ctx.reply("test");
  });

  // Handle button clicks
  bot.callbackQuery("recent", async (ctx) => {
    console.log("✅ Button clicked: recent");
    await ctx.answerCallbackQuery(); // Acknowledge the button click
    await getRecentActivity(ctx);
  });

  bot.command("recent", async (ctx) => {
    console.log("✅ Handler triggered: /recent");
    await getRecentActivity(ctx);
  });

  return bot;
}
