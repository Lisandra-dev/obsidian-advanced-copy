import i18next from "i18next";
import {App, PluginSettingTab, setIcon, Setting} from "obsidian";

import {ApplyingToView, CalloutKeepTitle, ConversionOfFootnotes, ConversionOfLinks, GlobalSettings} from "./interface";
import CopyReadingInMarkdown from "./main";

interface Tab {
	name: string;
	id: string
	icon: string;
}

export class CopyReadingMarkdownSettingsTab extends PluginSettingTab {
	plugin: CopyReadingInMarkdown;
	settingsPage: HTMLElement;
	
	READING: Tab = {
		name: i18next.t("reading.title"),
		id: "reading",
		icon: "book-open"
	};
	
	EDIT: Tab = {
		name: i18next.t("edit.title"),
		id: "edit",
		icon: "pencil"
	};
	
	TABS: Tab[] = [
		{
			name: "Global",
			id: "global",
			icon: "globe"
		},
	];
	
	constructor(app: App, plugin: CopyReadingInMarkdown) {
		super(app, plugin);
		this.plugin = plugin;
	}
	
	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		
		const tabBar = containerEl.createEl("nav", { cls: "settings-tab-bar" });
		//remove Tab based on applying
		if (this.plugin.settings.applyingTo === ApplyingToView.reading) {
			this.TABS.push(this.READING);
			this.TABS.remove(this.EDIT);
			this.TABS = [...new Set(this.TABS)];
		} else if (this.plugin.settings.applyingTo === ApplyingToView.edit) {
			this.TABS.push(this.EDIT);
			this.TABS.remove(this.READING);
			this.TABS = [...new Set(this.TABS)];
		} else {
			this.TABS.push(this.EDIT);
			this.TABS.push(this.READING);
			// remove duplicate
			this.TABS = [...new Set(this.TABS)];
		}
		for (const tabInfo of this.TABS) {
			const tabEl = tabBar.createEl("div", {cls: "settings-tab"});
			const tabIcon = tabEl.createEl("div", {cls: "settings-tab-icon"});
			setIcon(tabIcon, tabInfo.icon);
			if (tabInfo.id === "global")
				tabEl.addClass("settings-tab-active");
			tabEl.createEl("div", {cls: "settings-copy-reading-md", text: tabInfo.name});
			tabEl.addEventListener("click", () => {
				// @ts-ignore
				for (const tabEl of tabBar.children)
					tabEl.removeClass("settings-tab-active");

				tabEl.addClass("settings-tab-active");
				this.renderSettingsPage(tabInfo.id);
			});
		}
		this.settingsPage = containerEl.createEl("div", { cls: "settings-tab-page" });
		this.renderSettingsPage("global");
		
	}
	
	renderSettingsPage(tab: string) {
		this.settingsPage.empty();
		switch (tab) {
		case "global":
			this.renderGlobal();
			break;
		case "reading":
			this.renderReading();
			break;
		case "edit":
			this.renderEdit();
			break;
		}
	}
	
	renderGlobal() {
		this.settingsPage.createEl("h1", {text: "Global"});
		new Setting(this.settingsPage)
			.setName(i18next.t("view.title"))
			.setDesc(i18next.t("view.desc"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("all", i18next.t("view.all"))
					.addOption("reading", i18next.t("view.reading"))
					.addOption("edit", i18next.t("view.edit"))
					.setValue(this.plugin.settings.applyingTo)
					.onChange(async (value) => {
						this.plugin.settings.applyingTo = value as ApplyingToView;
						await this.plugin.saveSettings();
						if (this.plugin.settings.applyingTo === ApplyingToView.edit) {
							this.plugin.settings.exportAsHTML = false;
							await this.plugin.saveSettings();
						}
						this.display();
					});
			});
	}
	

	
	renderReading() {
		this.settingsPage.createEl("h1", {text: i18next.t("reading.desc")});
		new Setting(this.settingsPage)
			.setName(i18next.t("copyAsHTML"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.exportAsHTML)
					.onChange(async (value) => {
						this.plugin.settings.exportAsHTML = value;
						await this.plugin.saveSettings();
						this.renderReading();
					});
			});
		if (!this.plugin.settings.exportAsHTML) {
			this.settingsPage.createEl("h2", {text: i18next.t("links")});
			this.links(this.plugin.settings.global);
			this.footnotes(this.plugin.settings.global);
				
			this.settingsPage.createEl("h2", {text: i18next.t("unconventionalMarkdown.title")});
			this.settingsPage.createEl("i", {text: i18next.t("unconventionalMarkdown.desc")});
			this.highlight(this.plugin.settings.global);
		}
			
		this.calloutTitle(this.plugin.settings.global);
			
		if (!this.plugin.settings.exportAsHTML) {
			this.settingsPage.createEl("h2", {text: i18next.t("other")});
			this.hardBreak(this.plugin.settings.global);
		}
	}
	
	renderEdit() {
		this.settingsPage.empty();
		this.settingsPage.createEl("h1", {text: i18next.t("edit.desc")});
		new Setting(this.settingsPage)
			.setName(i18next.t("wikiToMarkdown.title"))
			.setDesc(i18next.t("wikiToMarkdown.desc"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.wikiToMarkdown)
					.onChange(async (value) => {
						this.plugin.settings.wikiToMarkdown = value;
						await this.plugin.saveSettings();
					});
			});
			
		new Setting(this.settingsPage)
			.setName(i18next.t("tabToSpace"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.tabToSpace)
					.onChange(async (value) => {
						this.plugin.settings.tabToSpace = value;
						await this.plugin.saveSettings();
						this.renderEdit();
					});
			});
			
		if (this.plugin.settings.tabToSpace) {
			new Setting(this.settingsPage)
				.setName(i18next.t("tabSpaceSize"))
				.addText((text) => {
					text
						.setValue(this.plugin.settings.tabSpaceSize.toString())
						.onChange(async (value) => {
							this.plugin.settings.tabSpaceSize = parseInt(value);
							if (isNaN(this.plugin.settings.tabSpaceSize)) {
								this.plugin.settings.tabSpaceSize = 4;
								text.inputEl.style.borderColor = "red";
							} else {
								text.inputEl.style.borderColor = "";
							}
							await this.plugin.saveSettings();
						});
				});
		}
			
		this.settingsPage.createEl("h2", {text: i18next.t("links")});
		this.links(this.plugin.settings.overrides);
		this.footnotes(this.plugin.settings.overrides);
		this.settingsPage.createEl("h2", {text: i18next.t("unconventionalMarkdown.title")});
		this.settingsPage.createEl("i", {text: i18next.t("unconventionalMarkdown.desc")});
		this.calloutTitle(this.plugin.settings.overrides);
		this.highlight(this.plugin.settings.overrides);
		this.settingsPage.createEl("h2", {text: i18next.t("other")});
		this.hardBreak(this.plugin.settings.overrides);
	}
	
	highlight(settings: GlobalSettings) {
		return new Setting(this.settingsPage)
			.setName(i18next.t("highlight.title"))
			.setDesc(i18next.t("highlight.desc"))
			.addToggle((toggle) => {
				toggle
					.setValue(settings.highlight)
					.onChange(async (value) => {
						settings.highlight = value;
						await this.plugin.saveSettings();
					});
			});
	}
	
	calloutTitle(settings: GlobalSettings) {
		return new Setting(this.settingsPage)
			.setName(i18next.t("callout.title"))
			.setDesc(i18next.t("callout.desc"))
			.setClass("copy-reading-in-markdown-dp")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("obsidian", i18next.t("callout.obsidian"))
					.addOption("strong", i18next.t("callout.strong"))
					.addOption("remove", i18next.t("callout.remove"))
					.setValue(settings.callout)
					.onChange(async (value) => {
						settings.callout = value as CalloutKeepTitle;
						await this.plugin.saveSettings();
					});
			});
	}
	
	footnotes(settings: GlobalSettings) {
		return new Setting(this.settingsPage)
			.setName(i18next.t("removeFootnotesLinks.title"))
			.setDesc(i18next.t("removeFootnotesLinks.desc"))
			.setClass("copy-reading-in-markdown-dp")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("keep", i18next.t("removeFootnotesLinks.keep"))
					.addOption("remove", i18next.t("removeFootnotesLinks.remove"))
					.addOption("format", i18next.t("removeFootnotesLinks.format"))
					.setValue(settings.footnotes)
					.onChange(async (value) => {
						settings.footnotes = value as ConversionOfFootnotes;
						await this.plugin.saveSettings();
					});
			});
	}
	
	links(settings: GlobalSettings) {
		return new Setting(this.settingsPage)
			.setName(i18next.t("copyLinksAsText.title"))
			.setDesc(i18next.t("copyLinksAsText.desc"))
			.setClass("copy-reading-in-markdown-dp")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("keep", i18next.t("copyLinksAsText.keep"))
					.addOption("remove", i18next.t("copyLinksAsText.remove"))
					.addOption("external", i18next.t("copyLinksAsText.external"))
					.setValue(settings.links)
					.onChange(async (value) => {
						settings.links = value as ConversionOfLinks;
						await this.plugin.saveSettings();
					});
			});
	}
	
	hardBreak(settings: GlobalSettings) {
		return new Setting(this.settingsPage)
			.setName(i18next.t("hardBreaks.title"))
			.setDesc(i18next.t("hardBreaks.desc"))
			.addToggle((toggle) => {
				toggle
					.setValue(settings.hardBreak)
					.onChange(async (value) => {
						settings.hardBreak = value;
						await this.plugin.saveSettings();
					});
			});
	}
}
